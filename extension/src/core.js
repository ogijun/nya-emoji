// DOM にも chrome.* にも触らない純粋関数。content script と options の両方から読み、node --test でも検証する。
const NyaCore = (() => {
  // 日本語名（:バッハ-nya: など）も通す。区切りは半角コロンだけ
  const EMOJI_RE = /:([\p{L}\p{N}\p{M}_+'-]+):/gu;
  const DEFAULT_PATTERNS = ['github.com'];

  /**
   * @param {string} host
   * @param {string[]} patterns "github.com" (完全一致) か "*.esa.io" (サブドメインのみ)
   * @returns {boolean}
   */
  function hostAllowed(host, patterns) {
    const h = host.toLowerCase();
    return patterns.some((raw) => {
      const p = raw.toLowerCase();
      return p.startsWith('*.') ? h.endsWith(p.slice(1)) : h === p;
    });
  }

  /**
   * @param {string} text 1行1パターン。空行と # 始まりは無視
   * @returns {string[]}
   */
  function parsePatterns(text) {
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
  }

  /**
   * テキストを文字列と {name} の並びに分ける。既知の絵文字が無ければ null。
   * 未知の :xxx: を飛ばしたあとの末尾コロンを次の候補の頭として使えるよう、lastIndex を戻す。
   * @param {string} text
   * @param {Set<string>} names
   * @returns {Array<string | {name: string}> | null}
   */
  function splitText(text, names) {
    const parts = [];
    let cursor = 0;
    const re = new RegExp(EMOJI_RE.source, 'gu');
    let m;
    while ((m = re.exec(text)) !== null) {
      if (!names.has(m[1])) {
        re.lastIndex = m.index + m[0].length - 1;
        continue;
      }
      if (m.index > cursor) parts.push(text.slice(cursor, m.index));
      parts.push({ name: m[1] });
      cursor = re.lastIndex;
    }
    if (parts.length === 0) return null;
    if (cursor < text.length) parts.push(text.slice(cursor));
    return parts;
  }

  /**
   * @param {string} path "all-nya/bow-nya.png" など
   * @returns {string}
   */
  function nameFromPath(path) {
    const base = path.split('/').pop() ?? '';
    // macOS のファイル名は NFD（濁点が分かれている）なので、ページの文字 (NFC) にそろえる
    return base.replace(/\.[^.]+$/, '').trim().normalize('NFC').toLowerCase();
  }

  /**
   * 同名の png と gif があるとき gif を後ろに並べる比較関数。取り込みは後勝ちなので gif（動く方）が残る。
   * @param {string} a @param {string} b @returns {number}
   */
  function preferOrder(a, b) {
    const isGif = (p) => (/\.gif$/i.test(p) ? 1 : 0);
    return isGif(a) - isGif(b);
  }

  return { DEFAULT_PATTERNS, hostAllowed, parsePatterns, splitText, nameFromPath, preferOrder };
})();

if (typeof module !== 'undefined') module.exports = NyaCore;
