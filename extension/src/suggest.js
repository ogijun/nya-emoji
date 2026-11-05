// 入力欄で :bo と打ったら猫の候補を出す。
// 猫が見つかったときだけ input / キー操作を横取りし、見つからなければサイト本来の動き（自前の絵文字候補など）にそのまま渡す。
// window の capture で聞くので、サイトのどのリスナーよりも先に呼ばれる。
(async () => {
  const { DEFAULT_PATTERNS, hostAllowed, tokenBeforeCaret, searchNames } = NyaCore;
  const { patterns = DEFAULT_PATTERNS, names = [] } = await chrome.storage.local.get(['patterns', 'names']);
  if (names.length === 0 || !hostAllowed(location.hostname, patterns)) return;

  const TEXT_INPUT_TYPES = new Set(['text', 'search', '']);
  /** @param {EventTarget | null} el @returns {el is HTMLTextAreaElement | HTMLInputElement} */
  const isTextField = (el) =>
    el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(el.getAttribute('type') ?? ''));

  // ---- 候補ポップアップ（サイトの CSS が効かないよう shadow DOM に置く） ----
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;display:none;';
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `<style>
    .box { padding:4px; background:#fff; color:#1f2328; border:1px solid #d0d7de; border-radius:8px;
           box-shadow:0 8px 24px rgba(0,0,0,.18); font:13px/1.4 system-ui,sans-serif; min-width:200px; max-width:360px; }
    ul { margin:0; padding:0; list-style:none; }
    li { display:flex; align-items:center; gap:8px; padding:3px 8px; border-radius:6px; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    li[aria-selected="true"] { background:#ddf4ff; }
    img { width:22px; height:22px; object-fit:contain; flex:none; }
    .hint { color:#656d76; font-size:11px; padding:4px 8px 2px; border-top:1px solid #eaeef2; margin-top:4px; }
  </style><div class="box"><ul role="listbox"></ul><div class="hint">↑↓ 選ぶ・Enter / Tab 決定・Esc サイトの候補へ</div></div>`;
  const list = shadow.querySelector('ul');

  /** 開いている間だけ持つ状態。閉じたら null */
  let open = null; // { field, start, caret, items, index }
  /** Esc で猫を断ったトークン（同じ field・同じ開始位置の間はサイトに任せる） */
  let declined = null; // { field, start }
  const urls = new Map();

  async function loadUrls(items) {
    const missing = items.filter((n) => !urls.has(n));
    if (missing.length === 0) return;
    const got = await chrome.storage.local.get(missing.map((n) => `img:${n}`));
    for (const n of missing) urls.set(n, got[`img:${n}`] ?? '');
  }

  function render() {
    list.replaceChildren(
      ...open.items.map((n, i) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(i === open.index));
        li.append(Object.assign(document.createElement('img'), { src: urls.get(n) || '', alt: '' }), `:${n}:`);
        // mousedown で決めるとフォーカスが入力欄から外れない
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          commit(i);
        });
        return li;
      }),
    );
  }

  function place(field, index) {
    const r = caretRect(field, index);
    host.style.display = 'block';
    const h = host.offsetHeight;
    const below = r.bottom + 4;
    host.style.top = `${below + h > innerHeight ? Math.max(0, r.top - h - 4) : below}px`;
    host.style.left = `${Math.min(r.left, innerWidth - host.offsetWidth - 8)}px`;
  }

  function close() {
    open = null;
    host.style.display = 'none';
  }

  /** 決定: 書きかけの ":bo" を ":bow-nya: " に差し替える */
  function commit(i) {
    const { field, start, caret, items } = open;
    const text = `:${items[i]}: `;
    close();
    field.focus();
    field.setSelectionRange(start, caret);
    // execCommand なら Undo が効き、サイトにも普通の input として届く（このとき猫トークンは閉じているので横取りしない）
    if (!document.execCommand('insertText', false, text)) {
      field.setRangeText(text, start, caret, 'end');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  /**
   * キャレット直前を見て、猫の候補を出す／閉じる。同期で判定を終えるので、呼び出し側がそのイベントを止めるか決められる。
   * @returns {boolean} 猫の候補を出したら true
   */
  function update(field) {
    const caret = field.selectionStart ?? 0;
    if (field.selectionEnd !== caret) return false;
    const token = tokenBeforeCaret(field.value, caret);
    if (!token || (declined && declined.field === field && declined.start === token.start)) {
      close();
      return false;
    }
    declined = null;
    const items = searchNames(names, token.query);
    if (items.length === 0) {
      close();
      return false;
    }
    open = { field, start: token.start, caret, items, index: 0 };
    // 画像の読み込みは待たずに出す（文字だけ先に出て、画像は追って入る）
    render();
    place(field, token.start);
    loadUrls(items).then(() => open && open.items === items && render());
    return true;
  }

  window.addEventListener(
    'input',
    (e) => {
      if (!isTextField(e.target) || e.isComposing) return;
      if (update(e.target)) e.stopImmediatePropagation();
    },
    true,
  );

  // 日本語入力の確定後（Safari は compositionend の後に input が来ないことがある）
  window.addEventListener('compositionend', (e) => isTextField(e.target) && update(e.target), true);

  window.addEventListener(
    'keydown',
    (e) => {
      if (!open || e.target !== open.field || e.isComposing || e.keyCode === 229) return;
      const n = open.items.length;
      const ctrl = e.ctrlKey && !e.metaKey && !e.altKey;
      let handled = true;
      if (e.key === 'ArrowDown' || (ctrl && e.key === 'n')) open.index = (open.index + 1) % n;
      else if (e.key === 'ArrowUp' || (ctrl && e.key === 'p')) open.index = (open.index - 1 + n) % n;
      else if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey) commit(open.index);
      else if (e.key === 'Escape') {
        // 猫を断ってサイトに渡す: 同じ入力をもう一度流し、サイトの絵文字候補を開かせる
        const field = open.field;
        declined = { field, start: open.start };
        close();
        field.dispatchEvent(new Event('input', { bubbles: true }));
      } else handled = false;
      if (!handled) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (open) render();
    },
    true,
  );

  // フォーカスが外れたら閉じる（次の入力でまた判定する）。スクロールは位置を合わせ直すだけ
  window.addEventListener('focusout', () => close(), true);
  window.addEventListener('scroll', () => open && place(open.field, open.start), true);
  window.addEventListener('mousedown', (e) => open && e.target !== host && close(), true);

  document.documentElement.append(host);

  /**
   * textarea / input の文字位置の画面座標。同じスタイルの見えない div に写して測る。
   * @param {HTMLTextAreaElement | HTMLInputElement} field
   * @param {number} index
   * @returns {{top: number, bottom: number, left: number}}
   */
  function caretRect(field, index) {
    const cs = getComputedStyle(field);
    const mirror = document.createElement('div');
    for (const p of [
      'boxSizing', 'width', 'height', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight',
      'textTransform', 'wordSpacing', 'textIndent', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'tabSize',
    ]) {
      mirror.style[p] = cs[p];
    }
    const isInput = field instanceof HTMLInputElement;
    Object.assign(mirror.style, {
      position: 'fixed',
      visibility: 'hidden',
      top: '0',
      left: '0',
      overflow: 'hidden',
      whiteSpace: isInput ? 'pre' : 'pre-wrap',
      wordWrap: 'break-word',
    });
    mirror.textContent = field.value.slice(0, index);
    const marker = document.createElement('span');
    marker.textContent = '​';
    mirror.append(marker);
    document.documentElement.append(mirror);
    const fr = field.getBoundingClientRect();
    const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
    const top = fr.top + marker.offsetTop - field.scrollTop;
    const left = fr.left + marker.offsetLeft - field.scrollLeft;
    mirror.remove();
    return { top, bottom: top + lineHeight, left };
  }
})();
