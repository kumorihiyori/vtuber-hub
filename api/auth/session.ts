import { verifyOwnerSession } from '../_lib/owner-session.js';

type ApiRequest = {
  method?: string;
  headers?: { cookie?: string };
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

export default function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!process.env.GOOGLE_ALLOWED_EMAIL || !process.env.SESSION_SECRET) {
    return res.status(500).json({ error: 'Owner session is not configured.' });
  }

  return res.status(200).json({ authenticated: verifyOwnerSession(req.headers?.cookie) });
}
