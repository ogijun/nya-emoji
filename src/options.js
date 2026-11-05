const { DEFAULT_PATTERNS, parsePatterns, nameFromPath, preferOrder, splitText } = NyaCore;
const $ = (id) => document.getElementById(id);

/** @param {File} file @returns {Promise<string>} */
const toDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(/** @type {string} */ (r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

/**
 * 設定画面の中の :xxx-nya: を取り込んだ画像に置き換える。取り込み前は文字のまま残る（成功の目印）。
 * content script と同じ処理だが、こちらは一度きり・監視なしなので別に書いてある。
 * @param {Element} root
 */
async function decorate(root) {
  const { names = [] } = await chrome.storage.local.get('names');
  const nameSet = new Set(names);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('code,textarea,script') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const jobs = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const parts = splitText(n.data, nameSet);
    if (parts) jobs.push([n, parts]);
  }
  const wanted = jobs.flatMap(([, parts]) => parts.filter((p) => typeof p !== 'string').map((p) => `img:${p.name}`));
  const imgs = wanted.length ? await chrome.storage.local.get(wanted) : {};
  for (const [node, parts] of jobs) {
    node.replaceWith(
      ...parts.map((p) =>
        typeof p === 'string'
          ? p
          : Object.assign(document.createElement('img'), { src: imgs[`img:${p.name}`], alt: `:${p.name}:`, title: `:${p.name}:`, className: 'nya' }),
      ),
    );
  }
}

/** 状態表示。文中の :xxx-nya: もネコチャンにする */
async function say(id, text) {
  $(id).textContent = text;
  await decorate($(id));
}

/** @template T @param {T[]} xs @param {number} n @returns {T[]} */
const sample = (xs, n) =>
  xs
    .map((x) => [Math.random(), x])
    .sort((a, b) => a[0] - b[0])
    .slice(0, n)
    .map(([, x]) => x);

async function showStatus() {
  const { names = [] } = await chrome.storage.local.get('names');
  await say('status', names.length ? `${names.length} 匹のネコチャンがいます :yatta-nya:` : 'まだ取り込んでいません :mada-nya:');
  // 毎回ちがうネコチャンを 40 匹
  const picked = sample(names, 40);
  const imgs = await chrome.storage.local.get(picked.map((n) => `img:${n}`));
  $('preview').replaceChildren(
    ...picked.map((n) => {
      const img = Object.assign(document.createElement('img'), { src: imgs[`img:${n}`], title: `:${n}:`, alt: `:${n}:` });
      img.addEventListener('click', async () => {
        await navigator.clipboard.writeText(`:${n}:`);
        await say('status', `:${n}: をコピーしました :ok-nya:`);
      });
      return img;
    }),
  );
}

$('folder').addEventListener('change', async (e) => {
  const files = [...e.target.files].filter((f) => f.type.startsWith('image/')).sort((a, b) => preferOrder(a.name, b.name));
  if (files.length === 0) {
    await say('status', '画像ファイルが見つかりませんでした :naki-nya:');
    return;
  }
  await say('status', `${files.length} 匹を読み込み中… :isogu-nya:`);
  // 同名が複数あれば後勝ち（preferOrder で gif を後ろにしてある）
  const entries = Object.fromEntries(
    await Promise.all(files.map(async (f) => [`img:${nameFromPath(f.webkitRelativePath || f.name)}`, await toDataUrl(f)])),
  );
  const names = Object.keys(entries).map((k) => k.slice(4)).sort();
  // 前回分を消してから入れ替える（フォルダから消えた子を残さない）
  const { names: old = [] } = await chrome.storage.local.get('names');
  await chrome.storage.local.remove(old.map((n) => `img:${n}`));
  await chrome.storage.local.set({ ...entries, names });
  // 見出しなどの :xxx-nya: も新しい画像で描き直すため再読み込み
  location.reload();
});

$('save').addEventListener('click', async () => {
  const patterns = parsePatterns($('patterns').value);
  await chrome.storage.local.set({ patterns });
  await say('saved', `保存しました（${patterns.length} 件） :ok-nya:`);
});

(async () => {
  const { patterns = DEFAULT_PATTERNS } = await chrome.storage.local.get('patterns');
  $('patterns').value = patterns.join('\n');
  await decorate(document.body);
  await showStatus();
})();
