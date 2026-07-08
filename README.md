# 🎮 PromptQuest — ゲーム形式プロンプト学習プラットフォーム

**PromptQuest** は、新人エンジニアが遊びながら生成AIのプロンプト作成スキルを鍛えられる、ゲーム形式の学習Webサイト（プロトタイプ）です。実務に近いシナリオ（クエスト）に挑戦し、**GitHub Models の LLM が即座にプロンプトを採点・フィードバック**します。XP を貯めてレベルを上げ、バッジを集めましょう。

> 📄 本アプリは [`documents/Summary-Requirements-prompt-learning-site.md`](documents/Summary-Requirements-prompt-learning-site.md) の要件定義に基づいて実装されています。

---

## ✨ 主な機能

| 機能 | 説明 |
| --- | --- |
| 🧩 **クエスト（課題）** | 初級・中級・上級に分かれた実務シナリオ課題。ログ要約、要件整理、コードレビュー、ペルソナ指定、段階的推論など。 |
| 🤖 **AI 即時採点** | GitHub Models の LLM が、課題の評価基準に沿ってプロンプトを 100 点満点で採点。良かった点・改善のヒント・お手本プロンプトを提示。 |
| 🏆 **報酬システム** | スコアに応じた XP 付与、レベル表示、累計 XP でアンロックされるバッジ。 |
| 📈 **進捗の可視化** | クリア数・累計 XP・挑戦履歴をマイページで確認。進捗はブラウザ（localStorage）に保存。 |
| 🌐 **多言語対応** | 日本語（デフォルト）と英語をワンクリックで切り替え。 |
| 🎨 **モダンな UI** | 明るくポップなレスポンシブデザイン。モバイル対応、アクセシビリティ（フォーカス表示・コントラスト・色以外での状態伝達）に配慮。 |

> ℹ️ プロトタイプのため **ユーザー認証は不要** です。

---

## 🛠 技術スタック

- **バックエンド**: Node.js + Express
- **フロントエンド**: HTML / CSS / Vanilla JavaScript（ビルドツール不要）
- **LLM**: [GitHub Models](https://github.com/marketplace/models)（Mock ではなく実際の LLM を利用）
- **国際化**: 言語別 JSON リソース（`locales/ja.json`, `locales/en.json`）

---

## 📁 プロジェクト構成

```
.
├── server.js              # Express サーバー（静的配信 + API）
├── package.json
├── .env.example           # 環境変数のサンプル
├── .gitignore
├── src/
│   ├── challenges.js      # クエスト（課題）・バッジのデータ定義
│   └── llm.js             # GitHub Models を用いたプロンプト評価クライアント
├── locales/
│   ├── ja.json            # 日本語 UI リソース
│   └── en.json            # 英語 UI リソース
├── public/
│   ├── index.html         # フロントエンドのエントリー
│   ├── css/
│   │   └── style.css      # スタイルシート
│   └── js/
│       ├── i18n.js        # 多言語ヘルパー
│       └── app.js         # アプリケーションロジック
├── test/
│   └── app.test.js        # 結合テスト（node --test）
└── documents/
    └── Summary-Requirements-prompt-learning-site.md
```

---

## 🚀 セットアップと起動

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` を `.env` にコピーし、GitHub Models のトークンを設定します。

```bash
cp .env.example .env
```

`.env` を編集します:

```env
# GitHub Models のアクセストークン (models:read 権限を持つ Personal Access Token)
GITHUB_TOKEN=あなたのトークン

# 利用する LLM モデル
GITHUB_MODELS_MODEL=openai/gpt-4o-mini

# GitHub Models の推論エンドポイント
GITHUB_MODELS_ENDPOINT=https://models.github.ai/inference/chat/completions

# サーバーのポート番号
PORT=3000
```

> 🔑 **トークンの発行方法**: [GitHub の Personal access tokens](https://github.com/settings/tokens) で `models:read` 権限を持つトークンを発行してください。トークンは `.env` にのみ記載し、リポジトリにコミットしないでください（`.gitignore` で除外済み）。

### 3. サーバーの起動

```bash
npm start
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

開発時はファイル変更を監視して自動再起動する `npm run dev` も利用できます。

---

## 🌐 API エンドポイント

| メソッド | パス | 説明 |
| --- | --- | --- |
| `GET` | `/api/challenges?lang=ja\|en` | クエスト一覧を取得 |
| `GET` | `/api/badges?lang=ja\|en` | バッジ定義を取得 |
| `GET` | `/api/i18n/:lang` | UI 翻訳リソースを取得 |
| `GET` | `/api/health` | サーバー状態と LLM 設定状況を取得 |
| `POST` | `/api/evaluate` | プロンプトを LLM で評価（`{ challengeId, prompt, lang }`） |

---

## 🧪 テスト

```bash
npm test
```

Node.js 標準のテストランナー（`node --test`）で、API の整合性や LLM 応答のパース処理を検証します。テストは外部 LLM を呼び出しません。

---

## 📝 補足

- 本アプリは学習目的の **プロトタイプ** です。
- 進捗データはサーバーではなくブラウザの `localStorage` に保存されます。
- LLM を実際に呼び出すには有効な `GITHUB_TOKEN` が必要です。未設定の場合、採点機能はエラーメッセージを返します。

---

## 📄 ライセンス

MIT
