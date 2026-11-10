import crypto from 'node:crypto';
import { Client } from 'pg';

function encryptText(text: string) {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error('TOKEN_ENCRYPTION_KEY is missing');

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'base64'), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const code = String(req.query.code || '');
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!code || !clientId || !clientSecret || !redirectUri) {
    return res.status(400).json({ error: 'Missing OAuth params' });
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Google token exchange failed:', tokenData);
      return res.status(400).json({ error: 'Token exchange failed' });
    }

    const refreshToken = tokenData.refresh_token;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token was not returned by Google.' });
    }

    const userInfoResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${encodeURIComponent(tokenData.access_token)}`
    );
    const userInfo = await userInfoResponse.json();

    if (!userInfo.email) {
      return res.status(400).json({ error: 'Could not resolve Google user email' });
    }

    const encrypted = encryptText(refreshToken);

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();
    await client.query(
      `
      INSERT INTO google_oauth_tokens (account_id, refresh_token_ciphertext, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (account_id)
      DO UPDATE SET refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext, updated_at = NOW()
      `,
      [userInfo.email, encrypted]
    );
    await client.end();

    return res.status(200).json({
      ok: true,
      email: userInfo.email,
      message: 'Google OAuth connected successfully.',
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.status(500).json({ error: 'Unexpected OAuth error' });
  }
}
