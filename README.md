# VTuber Hub

React + Vite + TypeScriptで作った、VTuber向け活動管理ダッシュボードです。

## ローカルで動かす場合

Node.js（LTS）をインストールし、このリポジトリをダウンロードしたフォルダーで次を実行します。

```bash
npm install
npm run dev
```

表示されたURL（通常は http://localhost:5173 ）をブラウザーで開きます。

## Vercelで公開する

1. [Vercel](https://vercel.com/) にGitHubアカウントでログインします。
2. **Add New → Project** を選び、`kumorihiyori/vtuber-hub` をImportします。
3. Framework Presetが **Vite**、Build Commandが `npm run build`、Output Directoryが `dist` になっていることを確認して **Deploy** を押します。
4. 完了すると `*.vercel.app` のURLが発行されます。

このプロジェクトにはGemini APIキーや外部サービスの認証情報を入れないでください。AI画面は現時点ではデモ表示で、実際のGemini API・YouTube・SNS連携はありません。公開前に内容やサンプルデータを確認してください。
