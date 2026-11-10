import crypto from 'node:crypto';

type ApiRequest = {
  method?: string;
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  redirect: (url: string) => void;
};

const COOKIE_PATH = '/api/google';
const STATE_COOKIE = 'google_oauth_state';
const VERIFIER_COOKIE = 'google_oauth_code_verifier';
const COOKIE_MAX_AGE_SECONDS = 600;

function oauthCookie(name: string, value: string, maxAge: number) {
  return `${name}=${value}; Path=${COOKIE_PATH}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export default function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: 'Google OAuth env is not configured.' });
  }

  let callbackUrl: URL;
  try {
    callbackUrl = new URL(redirectUri);
  } catch {
    return res.status(500).json({ error: 'Google OAuth redirect URI is invalid.' });
  }

  if (
    callbackUrl.protocol !== 'https:' ||
    callbackUrl.pathname !== '/api/google/callback' ||
    callbackUrl.search ||
    callbackUrl.hash ||
    callbackUrl.username ||
    callbackUrl.password
  ) {
    return res.status(500).json({ error: 'Google OAuth redirect URI is invalid.' });
  }

  const state = crypto.randomBytes(32).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  res.setHeader('Set-Cookie', [
    oauthCookie(STATE_COOKIE, state, COOKIE_MAX_AGE_SECONDS),
    oauthCookie(VERIFIER_COOKIE, codeVerifier, COOKIE_MAX_AGE_SECONDS),
  ]);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
    ].join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
