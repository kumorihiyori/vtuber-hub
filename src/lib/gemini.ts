export async function generateGeminiText(prompt: string): Promise<string> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  const data = (await response.json()) as { text?: string; error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'AI生成に失敗しました。');
  }

  if (!data.text) {
    throw new Error('Geminiから文章が返されませんでした。');
  }

  return data.text;
}
