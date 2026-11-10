type ApiRequest = {
  method?: string;
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

import { clearOwnerSessionCookie } from '../_lib/owner-session';

export default function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  res.setHeader('Set-Cookie', clearOwnerSessionCookie());
  return res.status(200).json({ ok: true });
}
