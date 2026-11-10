Vercelの **Settings → Environment Variables** に、次の変数を設定してください。

- `GEMINI_API_KEY`: Google AI Studioで作成したGemini APIキー（秘密情報）
- `GEMINI_MODEL`（任意）: 使用するGeminiモデルID。未設定時は `gemini-2.0-flash`

`GEMINI_API_KEY` はブラウザーへ公開しないため、`VITE_` を付けないでください。設定を追加・変更した場合はVercelで再デプロイしてください。AIアシスタントは `/api/gemini` のサーバー関数経由でGeminiを呼び出します。

このAPIは公開サイトから利用できるエンドポイントです。Geminiの利用量・課金を監視し、Google AI Studio側のキー制限を設定してください。公開利用を広げる前に、必要に応じてログインやレート制限も追加してください。
