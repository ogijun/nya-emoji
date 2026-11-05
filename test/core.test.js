const test = require('node:test');
const assert = require('node:assert/strict');
const { hostAllowed, splitText, nameFromPath, parsePatterns, preferOrder } = require('../src/core.js');

test('hostAllowed: 完全一致', () => {
  assert.equal(hostAllowed('github.com', ['github.com']), true);
  assert.equal(hostAllowed('gist.github.com', ['github.com']), false);
});

test('hostAllowed: *. はサブドメインだけに一致', () => {
  assert.equal(hostAllowed('foo.esa.io', ['*.esa.io']), true);
  assert.equal(hostAllowed('esa.io', ['*.esa.io']), false);
  assert.equal(hostAllowed('evilesa.io', ['*.esa.io']), false);
});

test('hostAllowed: 大文字小文字を無視', () => {
  assert.equal(hostAllowed('GitHub.com', ['github.COM']), true);
});

test('parsePatterns: 空行・コメント・前後空白を除く', () => {
  assert.deepEqual(parsePatterns(' github.com \n\n# memo\n*.esa.io\n'), ['github.com', '*.esa.io']);
});

test('splitText: 既知の名前だけ絵文字に分ける', () => {
  const names = new Set(['bow-nya', 'ok_nya']);
  assert.deepEqual(splitText('ありがとう :bow-nya: です :unknown: :ok_nya:', names), [
    'ありがとう ',
    { name: 'bow-nya' },
    ' です :unknown: ',
    { name: 'ok_nya' },
  ]);
});

test('splitText: 一致が無ければ null', () => {
  assert.equal(splitText('10:30:00 と :nope:', new Set(['bow-nya'])), null);
});

test('splitText: 連続した絵文字', () => {
  assert.deepEqual(splitText(':a::b:', new Set(['a', 'b'])), [{ name: 'a' }, { name: 'b' }]);
});

test('splitText: 時刻の中のコロンに引きずられない', () => {
  assert.deepEqual(splitText('12:00:bow-nya:', new Set(['bow-nya'])), ['12:00', { name: 'bow-nya' }]);
});

test('nameFromPath: フォルダと拡張子を落とし小文字に', () => {
  assert.equal(nameFromPath('all-nya/sub/Bow-Nya.PNG'), 'bow-nya');
  assert.equal(nameFromPath('ok_nya.gif'), 'ok_nya');
});

test('nameFromPath: 前後の空白を落とす', () => {
  assert.equal(nameFromPath('all-nya/benkyou-nya .png'), 'benkyou-nya');
});

test('nameFromPath: macOS のファイル名 (NFD) を NFC にそろえる', () => {
  assert.equal(nameFromPath('バッハ-nya.png'.normalize('NFD')), 'バッハ-nya');
  assert.equal(nameFromPath('ヴィーnyaス誕生.gif'.normalize('NFD')), 'ヴィーnyaス誕生');
});

test('splitText: 日本語の名前', () => {
  const names = new Set(['バッハ-nya', '牛乳を注ぐおんnya']);
  assert.deepEqual(splitText('今日は:バッハ-nya:と:牛乳を注ぐおんnya:', names), [
    '今日は',
    { name: 'バッハ-nya' },
    'と',
    { name: '牛乳を注ぐおんnya' },
  ]);
});

test('splitText: 全角コロンは区切りにしない', () => {
  assert.equal(splitText('注意：バッハ-nya：', new Set(['バッハ-nya'])), null);
});

test('preferOrder: 同名なら gif を後ろに並べる (後勝ちで gif が残る)', () => {
  const files = ['medetai-nya.gif', 'medetai-nya.png', 'a.png'];
  assert.deepEqual([...files].sort(preferOrder), ['medetai-nya.png', 'a.png', 'medetai-nya.gif']);
});
