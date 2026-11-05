// ページ内のテキストにある :name: を画像に置き換える。投稿の中身は変えない（表示だけ）。
(async () => {
  const { DEFAULT_PATTERNS, hostAllowed, splitText } = NyaCore;
  const { patterns = DEFAULT_PATTERNS, names = [] } = await chrome.storage.local.get(['patterns', 'names']);
  if (names.length === 0 || !hostAllowed(location.hostname, patterns)) return;

  const nameSet = new Set(names);
  // 入力中の文字やコードは置き換えない
  const SKIP = 'head,script,style,noscript,textarea,input,code,pre,[contenteditable=""],[contenteditable="true"]';
  const urls = new Map();

  /** @param {Node} root @returns {Array<[Text, Array<string | {name: string}>]>} */
  function collect(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      const parts = root.parentElement?.closest(SKIP) ? null : splitText(root.data, nameSet);
      return parts ? [[root, parts]] : [];
    }
    if (root.nodeType !== Node.ELEMENT_NODE || root.closest(SKIP)) return [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.data.includes(':') && !n.parentElement?.closest(SKIP) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    const found = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const parts = splitText(n.data, nameSet);
      if (parts) found.push([n, parts]);
    }
    return found;
  }

  /** 見つかった絵文字の画像だけを storage から取り出す */
  async function loadUrls(jobs) {
    const missing = [
      ...new Set(jobs.flatMap(([, parts]) => parts.filter((p) => typeof p !== 'string').map((p) => p.name))),
    ].filter((n) => !urls.has(n));
    if (missing.length === 0) return;
    const got = await chrome.storage.local.get(missing.map((n) => `img:${n}`));
    for (const n of missing) {
      const url = got[`img:${n}`];
      if (url) urls.set(n, url);
      else nameSet.delete(n); // 画像が無い名前は以後探さない（文字のまま戻した節を再検出して回り続けないため）
    }
  }

  function render(parts) {
    const frag = document.createDocumentFragment();
    for (const p of parts) {
      const url = typeof p === 'string' ? null : urls.get(p.name);
      if (!url) {
        frag.append(typeof p === 'string' ? p : `:${p.name}:`);
        continue;
      }
      const img = document.createElement('img');
      img.src = url;
      img.alt = img.title = `:${p.name}:`;
      img.className = 'nya-emoji';
      img.style.cssText = 'height:1.4em;width:auto;vertical-align:-0.35em;display:inline;margin:0 0.05em;';
      frag.append(img);
    }
    return frag;
  }

  async function processRoots(roots) {
    const jobs = roots.flatMap(collect);
    if (jobs.length === 0) return;
    await loadUrls(jobs);
    for (const [node, parts] of jobs) {
      // 待っている間に消えた・書き換わったノードは触らない（次の変更通知で拾い直す）
      if (node.isConnected && splitText(node.data, nameSet)) node.replaceWith(render(parts));
    }
  }

  let pending = new Set();
  let timer = null;
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') pending.add(r.target);
      else r.addedNodes.forEach((n) => pending.add(n));
    }
    if (timer === null) {
      timer = setTimeout(() => {
        const roots = [...pending].filter((n) => n.isConnected);
        pending = new Set();
        timer = null;
        processRoots(roots);
      }, 150);
    }
  });

  // 要素ではなく document を見る: 一部の SPA は <html> 要素ごと差し替えるので、要素を監視すると外れる
  observer.observe(document, { childList: true, subtree: true, characterData: true });
  await processRoots([document.documentElement]);
})();
