# insta-auto-post

毎日の投稿テーマや素材メモを入力すると、Instagram 投稿用のキャプション案を AI（Claude）が 3 種類生成する Web アプリの試作品です。

## できること

1. **今日の投稿テーマ・素材メモを入力**
2. **AI がキャプションを 3 案生成**（ハッシュタグ付き。本文はその場で編集可）
   - 案1：スタイルガイドに沿った **深めトーン**（日常のあるある → 体で起きていること → ピラティス的な視点の転換 → 身体感覚 → 読者に委ねる締め）
   - 案2・3：軽めトーン
3. **気に入った案を保存** → 「保存済み」タブで一覧・コピー・削除

スマホでの利用を想定したシンプルな 1 画面構成です。

## 起動方法

Node.js 22 以上が必要です。

```bash
npm install
cp .env.example .env   # ANTHROPIC_API_KEY を記入
npm start
```

ブラウザで http://localhost:3000 を開きます。
同じ Wi-Fi のスマホからは `http://<PCのIPアドレス>:3000` でアクセスできます。

`ANTHROPIC_API_KEY` が未設定の場合は、ダミーの案を返す **お試しモード** で動きます（画面の動作確認用）。

## 構成

| ファイル | 内容 |
| --- | --- |
| `server.js` | Node.js の HTTP サーバー。Claude API 呼び出しと保存 API |
| `public/` | 画面（HTML / CSS / JavaScript） |
| `data/saved.json` | 保存した投稿文（自動作成・Git 管理外） |

### API

| メソッド | パス | 内容 |
| --- | --- | --- |
| POST | `/api/generate` | `{ theme }` を受け取り、キャプション 3 案を返す |
| GET | `/api/saved` | 保存済み一覧 |
| POST | `/api/saved` | 案を保存 |
| DELETE | `/api/saved/:id` | 保存済みを削除 |

## 設定（.env）

| 変数 | 既定値 | 内容 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | なし | Anthropic の API キー |
| `CLAUDE_MODEL` | `claude-opus-5` | 使用するモデル |
| `PORT` | `3000` | ポート番号 |

## スタイルガイドの変更

深めトーンの書き方の型・トーンのルールは `server.js` の `SYSTEM_PROMPT` に書かれています。表現を調整したいときはここを編集してください。

## メモ（試作品としての割り切り）

- 保存先はサーバー上の JSON ファイルです。ユーザー認証はありません。
- Instagram への自動投稿は未対応です（今後の拡張候補）。
