# Cattleya Audio Checker 🎤

Google Drive の音声ファイルを自動で文字起こしして、手入力の文字データと照合するアプリです。

## ✨ 機能

- 🎤 **音声認識** - OpenAI Whisper APIで日本語音声を自動文字起こし
- 📝 **テキスト照合** - 文字起こしテキストとの一致度を自動計算
- 📊 **差分表示** - 異なる文字を色分けしてハイライト表示
- 📱 **モバイル対応** - iPhone/iPad/PCで利用可能

## 🚀 セットアップ

### 開発環境

\`\`\`bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ブラウザで http://localhost:3000 にアクセス
\`\`\`

### 本番ビルド

\`\`\`bash
npm run build
\`\`\`

## 📋 必要な設定

### OpenAI APIキー

1. https://platform.openai.com/api-keys にアクセス
2. 新しい API キーを生成
3. アプリで入力

## 📁 ファイル構成

\`\`\`
cattleya-audio-checker/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   └── index.css
└── README.md
\`\`\`

## 🌐 Vercel デプロイ

1. GitHub リポジトリと Vercel を接続
2. 自動的にデプロイされます
3. 環境変数の設定は不要です

## 📖 使い方

1. **音声ファイルを選択** - ローカルから選択
2. **テキストデータを入力** - 照合対象テキストを入力
3. **OpenAI APIキーを入力** - Whisper API用
4. **「音声を認識して照合」をクリック** - 処理開始
5. **結果表示** - スコア＆差分を確認

## 🔒 セキュリティ

- APIキーはローカルのみ保存
- サーバーに送信されません
- 音声ファイルもブラウザ内でのみ処理

## 📄 ライセンス

MIT
