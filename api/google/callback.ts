import crypto from 'node:crypto';
import { Client } from 'pg';
import { createOwnerSession, ownerSessionCookie } from '../_lib/owner-session.js';

type ApiRequest = {
  method?: string;
  headers?: { cookie?: string };
  query: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  end: () => void;
};

const COOKIE_PATH = '/api/google';
const STATE_COOKIE = 'google_oauth_state';
const VERIFIER_COOKIE = 'google_oauth_code_verifier';

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function getCookie(req: ApiRequest, name: string) {
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return '';

  const prefix = `${name}=`;
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return cookie ? cookie.slice(prefix.length) : '';
}

function equalSecret(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function clearOAuthCookies(res: ApiResponse) {
  res.setHeader('Set-Cookie', [
    `${STATE_COOKIE}=; Path=${COOKIE_PATH}; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    `${VERIFIER_COOKIE}=; Path=${COOKIE_PATH}; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  ]);
}

function encryptText(text: string) {
  const encodedKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!encodedKey) throw new Error('TOKEN_ENCRYPTION_KEY is missing');

  const key = Buffer.from(encodedKey, 'base64');
  if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must decode to 32 bytes');

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  clearOAuthCookies(res);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const returnedState = getQueryValue(req.query.state);
  const savedState = getCookie(req, STATE_COOKIE);
  const codeVerifier = getCookie(req, VERIFIER_COOKIE);

  if (
    !/^[a-f0-9]{64}$/.test(returnedState) ||
    !/^[a-f0-9]{64}$/.test(savedState) ||
    !equalSecret(returnedState, savedState) ||
    !/^[A-Za-z0-9_-]{43}$/.test(codeVerifier)
  ) {
    return res.status(400).json({ error: 'Invalid or expired OAuth state. Please start login again.' });
  }

  const googleError = getQueryValue(req.query.error);
  if (googleError) {
    return res.status(400).json({ error: 'Google authorization was not completed.' });
  }

  const code = getQueryValue(req.query.code);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const databaseUrl = process.env.DATABASE_URL;
  const allowedEmail = process.env.GOOGLE_ALLOWED_EMAIL?.trim().toLowerCase();

  if (!code || !clientId || !clientSecret || !redirectUri || !databaseUrl) {
    return res.status(400).json({ error: 'Required OAuth or database configuration is missing.' });
  }
  if (!allowedEmail) {
    return res.status(500).json({ error: 'Owner email is not configured.' });
  }
  if (!process.env.SESSION_SECRET || Buffer.byteLength(process.env.SESSION_SECRET, 'utf8') < 32) {
    return res.status(500).json({ error: 'Owner session is not configured.' });
  }

  try {
    const callbackUrl = new URL(redirectUri);
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

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
    });
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || typeof tokenData.access_token !== 'string') {
      console.error('Google token exchange failed with status:', tokenResponse.status);
      return res.status(400).json({ error: 'Google token exchange failed.' });
    }
    if (typeof tokenData.refresh_token !== 'string' || !tokenData.refresh_token) {
      return res.status(400).json({ error: 'Google did not return a refresh token. Please revoke access and try again.' });
    }

    const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userInfoResponse.ok) {
      return res.status(400).json({ error: 'Could not verify the Google account.' });
    }

    const userInfo = await userInfoResponse.json();
    if (typeof userInfo.email !== 'string' || userInfo.email_verified !== true) {
      return res.status(400).json({ error: 'A verified Google email address is required.' });
    }

    const email = userInfo.email.trim().toLowerCase();
    if (email !== allowedEmail) {
      return res.status(403).json({ error: 'This Google account is not allowed to use this app.' });
    }

    const encryptedRefreshToken = encryptText(tokenData.refresh_token);
    const client = new Client({ connectionString: databaseUrl });
    try {
      await client.connect();
      await client.query(
        `
        INSERT INTO google_oauth_tokens (account_id, refresh_token_ciphertext, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (account_id)
        DO UPDATE SET refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext, updated_at = NOW()
        `,
        [email, encryptedRefreshToken],
      );
    } finally {
      await client.end().catch(() => undefined);
    }

    const sessionToken = createOwnerSession(email);
    res.setHeader('Set-Cookie', [
      `${STATE_COOKIE}=; Path=${COOKIE_PATH}; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      `${VERIFIER_COOKIE}=; Path=${COOKIE_PATH}; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      ownerSessionCookie(sessionToken),
    ]);
    res.setHeader('Location', '/?connected=1');
    return res.status(302).end();
  } catch (error) {
    console.error('OAuth callback failed:', error instanceof Error ? error.message : 'unknown error');
    return res.status(500).json({ error: 'Unexpected OAuth error.' });
  }
}
