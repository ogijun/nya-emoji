# nya-emoji

GitHub などのページに書かれた `:bow-nya:` を、ネコチャン絵文字の画像で表示する Chrome 拡張。

- **表示だけ**: ページの文字を表示時に置き換える。投稿の中身は `:bow-nya:` のまま。拡張を入れた人の画面でだけ画像になる
- 入力欄（textarea・編集中の contenteditable）と `code` / `pre` の中は置き換えない
- 手渡し用。Web Store には出さない。画像はリポに入れない（各自が取り込む）。ネコチャン絵文字は[しかまつさん](https://note.com/shikamatsu/n/nd217dc0617db)の作品

## 入れ方

1. [しかまつさんの note](https://note.com/shikamatsu/n/nd217dc0617db) から zip を落として展開する
2. `chrome://extensions` → デベロッパーモードを ON →「パッケージ化されていない拡張機能を読み込む」でこのリポのディレクトリを選ぶ
3. ツールバーの拡張アイコン（または拡張の「オプション」）で設定画面を開き、展開した `all-nya` フォルダを選ぶ。見出しの `:youkoso-nya:` などがネコチャンになれば成功。プレビューのネコチャンを押すと `:名前:` をコピーできる
4. 開いているタブを再読み込みする

絵文字名はファイル名（拡張子なし・小文字・前後の空白を除く。日本語名もそのまま使える）。同名の png と gif があれば動く gif を使う。`bow-nya.png` → `:bow-nya:`。zip が更新されたら同じ手順でフォルダを選び直す（前回分は入れ替わる）。

## 表示するサイト

設定画面のホワイトリストで決める。既定は `github.com`。

- `github.com` は完全一致（`gist.github.com` は含まない）
- `*.esa.io` はサブドメインに一致

## 開発

```sh
npm test   # src/core.js の純粋関数のテスト (node --test)
```

| ファイル | 役割 |
|---|---|
| `src/core.js` | ホスト判定・テキスト分割など DOM に触らない関数 |
| `src/content.js` | テキストノードを走査して置換。`document` を MutationObserver で監視（一部の SPA は `<html>` ごと差し替えるため要素ではなく document を見る） |
| `src/options.*` | 画像フォルダの取り込み（`chrome.storage.local` に data URL で保存）とホワイトリスト |

保存形式: `names`（名前の配列）、`img:<name>`（data URL）、`patterns`（ホワイトリスト）。content script は `names` だけを読み、ページに出てきた名前の画像だけを取り出す。
