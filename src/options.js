const { DEFAULT_PATTERNS, parsePatterns, nameFromPath, preferOrder } = NyaCore;
const $ = (id) => document.getElementById(id);

/** @param {File} file @returns {Promise<string>} */
const toDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(/** @type {string} */ (r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

async function showStatus() {
  const { names = [] } = await chrome.storage.local.get('names');
  $('status').textContent = names.length ? `${names.length} 個を取り込み済み` : 'まだ取り込んでいません';
  const sample = names.slice(0, 40);
  const imgs = await chrome.storage.local.get(sample.map((n) => `img:${n}`));
  $('preview').replaceChildren(
    ...sample.map((n) => Object.assign(document.createElement('img'), { src: imgs[`img:${n}`], title: `:${n}:` })),
  );
}

$('folder').addEventListener('change', async (e) => {
  const files = [...e.target.files].filter((f) => f.type.startsWith('image/')).sort((a, b) => preferOrder(a.name, b.name));
  if (files.length === 0) {
    $('status').textContent = '画像ファイルが見つかりませんでした';
    return;
  }
  $('status').textContent = `${files.length} 個を読み込み中…`;
  // 同名が複数あれば後勝ち（preferOrder で gif を後ろにしてある）
  const entries = Object.fromEntries(
    await Promise.all(files.map(async (f) => [`img:${nameFromPath(f.webkitRelativePath || f.name)}`, await toDataUrl(f)])),
  );
  const names = Object.keys(entries).map((k) => k.slice(4)).sort();
  // 前回分を消してから入れ替える（フォルダから消えた子を残さない）
  const { names: old = [] } = await chrome.storage.local.get('names');
  await chrome.storage.local.remove(old.map((n) => `img:${n}`));
  await chrome.storage.local.set({ ...entries, names });
  await showStatus();
});

$('save').addEventListener('click', async () => {
  const patterns = parsePatterns($('patterns').value);
  await chrome.storage.local.set({ patterns });
  $('saved').textContent = `保存しました（${patterns.length} 件）`;
});

(async () => {
  const { patterns = DEFAULT_PATTERNS } = await chrome.storage.local.get('patterns');
  $('patterns').value = patterns.join('\n');
  await showStatus();
})();
