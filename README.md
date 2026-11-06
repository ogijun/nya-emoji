# nya-emoji

Slack のカスタム絵文字としておなじみの[ネコチャン絵文字](https://note.com/shikamatsu/n/nd217dc0617db)を、Slack 以外のサイトでも使えるようにする Chrome / Safari 拡張です。

- **表示**: ページに書かれた `:bow-nya:` を、ネコチャンの画像に置き換えて表示します
- **入力**: 入力欄で `:bo` と打つと猫の候補が出て、選ぶと `:bow-nya:` が入ります

> [!IMPORTANT]
> **ネコチャン絵文字の画像はこのリポジトリに含まれていません。** 各自が作者の配布ページから入手して、拡張に取り込みます。
> 画像の権利は作者の[しかまつさん](https://x.com/shi_ka_ma_tsu)にあります。使う前に[ネコチャン絵文字の利用に関するおやくそく](https://note.com/shikamatsu/n/n8818bb5ebea1)を読んでください。

## できること

### ページの `:name:` を画像で表示する

- 置き換えるのは表示だけで、投稿の中身は `:bow-nya:` という文字のままです。**画像に見えるのは拡張を入れている人だけ**で、他の人には文字のまま見えます
- 後から読み込まれる部分（SPA の画面遷移、コメントの追加など）も追いかけて置き換えます
- 入力欄（textarea、編集中の contenteditable）と `code` / `pre` の中は置き換えません
- 動くのは設定画面で許可したサイトだけです（既定は `github.com`）

### 入力中に猫の候補を出す

textarea / input で `:` に続けて打つと、名前が合う猫の候補が出ます。

| キー | 動き |
|---|---|
| ↑ ↓（Ctrl+P / Ctrl+N） | 候補を選ぶ |
| Enter / Tab | `:bow-nya: ` を入れる |
| Esc | 猫の候補を閉じて、サイト本来の絵文字候補に切り替える |

GitHub などのサイトも `:` で自前の絵文字候補を出します。そこで、**猫が見つかったときだけ拡張が入力を受け持ち、見つからないとき（`:smile` など）はサイト本来の動きにそのまま渡します**。`10:30` のような英数字の直後のコロンでは候補を出しません。

リッチエディタ（contenteditable）での候補表示には対応していません。

## 入れ方

### 1. ネコチャン絵文字を入手する

[しかまつさんの note](https://note.com/shikamatsu/n/nd217dc0617db) から zip を落として展開します。中の `all-nya` フォルダが全部入りです。

### 2a. Chrome に入れる

1. `chrome://extensions` を開き、右上の「デベロッパーモード」を ON にする
2. 「パッケージ化されていない拡張機能を読み込む」で、このリポジトリの **`extension/`** ディレクトリを選ぶ（リポジトリ直下ではありません）

### 2b. Safari に入れる（macOS 14 以降・Xcode が必要）

```sh
xcodebuild -project "safari/nya emoji/nya emoji.xcodeproj" -scheme "nya emoji" -configuration Debug \
  -derivedDataPath safari/build CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= build
```

1. Safari の設定 →「詳細」→「Web デベロッパ用の機能を表示」を ON にする
2. 設定 →「デベロッパ」→「署名されていない機能拡張を許可」を ON にする（Safari を終了するたびに OFF に戻ります）
3. **2 の後で** app を起動する: `open "safari/build/Build/Products/Debug/nya emoji.app"`（先に起動していても、許可を ON にした後で起動し直さないと一覧に出ません）
4. 設定 →「機能拡張」で nya emoji を ON にし、Web サイトへのアクセスを許可する

コードを更新したら、ビルドし直して app を起動し直し、「機能拡張」でチェックを一度外して付け直します。

### 3. 絵文字を取り込む

拡張のアイコン（または拡張の「オプション」「設定…」）から設定画面を開き、展開した `all-nya` フォルダを選びます。設定画面の見出しにある `:youkoso-nya:` などがネコチャンになれば成功です。そのあと、開いているタブを再読み込みします。

- 絵文字名はファイル名です（`bow-nya.png` → `:bow-nya:`）。拡張子を除き、小文字にし、前後の空白を落とします。日本語名（`:バッハ-nya:` など）もそのまま使えます
- 同じ名前の png と gif があるときは、動く gif を使います
- 絵文字が更新されたら、同じ手順でフォルダを選び直してください。前回の分はまとめて入れ替わります
- プレビューのネコチャンを押すと `:名前:` をコピーできます

## 設定: 動かすサイト

設定画面に、拡張を動かすサイトを 1 行に 1 つずつ書きます。既定は `github.com` だけです。

| 書き方 | 一致するもの |
|---|---|
| `github.com` | `github.com` だけ（`gist.github.com` は含まない） |
| `*.esa.io` | `foo.esa.io` などのサブドメイン（`esa.io` 自体は含まない） |
| `# メモ` | `#` で始まる行は無視 |

保存したら、開いているタブを再読み込みしてください。

## 仕組み

| ファイル | 役割 |
|---|---|
| `extension/src/core.js` | ホスト判定、テキストの分割、候補の検索など、DOM に触らない関数 |
| `extension/src/content.js` | テキストノードを走査して置き換える。`document` を MutationObserver で監視する（`<html>` 要素ごと差し替えるサイトがあるため、要素ではなく document を見る） |
| `extension/src/suggest.js` | 入力中の候補。`window` の capture 段階で input / keydown をサイトより先に受け、猫の候補があるときだけイベントを止める |
| `extension/src/options.*` | 画像フォルダの取り込みと、動かすサイトの設定 |
| `safari/` | Safari 版の Xcode プロジェクト（`safari-web-extension-converter` で生成）。`extension/` を参照するので、コードは Chrome 版と共通 |

- 画像は `chrome.storage.local` に data URL で保存します（`img:<name>`）。名前の一覧（`names`）と、動かすサイト（`patterns`）も同じ場所に置きます
- content script は名前の一覧だけを読み、ページに出てきた名前の画像だけを取り出します
- 外部への通信はしません。画像は手元に取り込んだものだけを使います

## 開発

```sh
npm test   # core.js の単体テスト（node --test、依存パッケージなし）
```

画像ファイル（`*.png` / `*.gif` / `*.zip`）は `.gitignore` で除外しています。ネコチャン絵文字の画像やスクリーンショットはコミットしないでください。

## ライセンス

- **コード**: [MIT License](LICENSE)
- **ネコチャン絵文字**: この MIT License の対象外です。権利は作者のしかまつさんにあり、[利用に関するおやくそく](https://note.com/shikamatsu/n/n8818bb5ebea1)に従います。最新の配布場所は [note](https://note.com/shikamatsu/n/nd217dc0617db) です
