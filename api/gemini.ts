import { verifyOwnerSession } from '../_lib/owner-session.js';

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers?: { cookie?: string };
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!verifyOwnerSession(req.headers?.cookie)) {
    return res.status(401).json({ error: 'Please log in with the authorized owner account.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API is not configured on the server.' });
  }

  const body = req.body as { prompt?: unknown } | null;
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return res.status(400).json({ error: 'プロンプトを入力してください。' });
  }
  if (prompt.length > 8000) {
    return res.status(400).json({ error: '入力は8000文字以内にしてください。' });
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );

    if (!response.ok) {
      console.error('Gemini API returned status:', response.status);
      return res.status(502).json({ error: 'Gemini APIへの接続に失敗しました。APIキーとモデル設定を確認してください。' });
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();

    if (!text) {
      return res.status(502).json({ error: 'Geminiから文章が返されませんでした。' });
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error('Gemini request failed:', error);
    return res.status(502).json({ error: 'Geminiへのリクエストに失敗しました。時間をおいて再度お試しください。' });
  }
}
