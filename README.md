# nya-emoji

GitHub などのページに書かれた `:bow-nya:` を、ネコチャン絵文字の画像で表示する Chrome 拡張。

- **表示だけ**: ページの文字を表示時に置き換える。投稿の中身は `:bow-nya:` のまま。拡張を入れた人の画面でだけ画像になる
- 入力欄（textarea・編集中の contenteditable）と `code` / `pre` の中は置き換えない
- **入力中の候補**: textarea / input で `:bo` と打つと猫の候補が出る（↑↓ で選び Enter / Tab で `:bow-nya: ` を入れる）。猫が見つからないときや Esc を押したときは、サイト本来の動き（GitHub などの自前の絵文字候補）にそのまま渡す。リッチエディタ（contenteditable）は未対応
- 手渡し用。Web Store には出さない。画像はリポに入れない（各自が取り込む）。ネコチャン絵文字は[しかまつさん](https://note.com/shikamatsu/n/nd217dc0617db)の作品

## 入れ方

1. [しかまつさんの note](https://note.com/shikamatsu/n/nd217dc0617db) から zip を落として展開する
2. `chrome://extensions` → デベロッパーモードを ON →「パッケージ化されていない拡張機能を読み込む」でこのリポの `extension/` ディレクトリを選ぶ
3. ツールバーの拡張アイコン（または拡張の「オプション」）で設定画面を開き、展開した `all-nya` フォルダを選ぶ。見出しの `:youkoso-nya:` などがネコチャンになれば成功。プレビューのネコチャンを押すと `:名前:` をコピーできる
4. 開いているタブを再読み込みする

絵文字名はファイル名（拡張子なし・小文字・前後の空白を除く。日本語名もそのまま使える）。同名の png と gif があれば動く gif を使う。`bow-nya.png` → `:bow-nya:`。zip が更新されたら同じ手順でフォルダを選び直す（前回分は入れ替わる）。

## Safari で使う

`safari/` に Xcode プロジェクトがある（`extension/` を参照しているので、拡張のコードは Chrome 版と共通）。macOS 14 以降。

```sh
xcodebuild -project "safari/nya emoji/nya emoji.xcodeproj" -scheme "nya emoji" -configuration Debug \
  -derivedDataPath safari/build CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= build
open "safari/build/Build/Products/Debug/nya emoji.app"
```

1. Safari の設定 →「詳細」→「Web デベロッパ用の機能を表示」を ON
2. 設定 →「デベロッパ」→「署名されていない機能拡張を許可」を ON（Safari を再起動するたびに必要）
3. **2 の後で** `nya emoji.app` を起動し直す（先に起動していても、許可を ON にした後で起動しないと「機能拡張」に出ない）
4. 設定 →「機能拡張」で nya emoji を ON にし、Web サイトへのアクセスを許可する
5. 設定画面（機能拡張の「設定…」かツールバーのアイコン）で `all-nya` フォルダを選ぶ

## 表示するサイト

設定画面のホワイトリストで決める。既定は `github.com`。

- `github.com` は完全一致（`gist.github.com` は含まない）
- `*.esa.io` はサブドメインに一致

## 開発

```sh
npm test   # extension/src/core.js の純粋関数のテスト (node --test)
```

| ファイル | 役割 |
|---|---|
| `extension/src/core.js` | ホスト判定・テキスト分割など DOM に触らない関数 |
| `extension/src/content.js` | テキストノードを走査して置換。`document` を MutationObserver で監視（一部の SPA は `<html>` ごと差し替えるため要素ではなく document を見る） |
| `extension/src/suggest.js` | 入力中の候補。`window` の capture で input / keydown を先に受け、猫の候補があるときだけ止める（無ければサイトに渡す） |
| `extension/src/options.*` | 画像フォルダの取り込み（`chrome.storage.local` に data URL で保存）とホワイトリスト |

保存形式: `names`（名前の配列）、`img:<name>`（data URL）、`patterns`（ホワイトリスト）。content script は `names` だけを読み、ページに出てきた名前の画像だけを取り出す。
