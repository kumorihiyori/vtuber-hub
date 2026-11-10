import crypto from 'node:crypto';

export const OWNER_SESSION_COOKIE = 'vtuber_hub_owner_session';
export const OWNER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('SESSION_SECRET must be configured with at least 32 bytes');
  }
  return secret;
}

function getAllowedEmail() {
  return process.env.GOOGLE_ALLOWED_EMAIL?.trim().toLowerCase() ?? '';
}

function sign(payload: string) {
  return crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

export function createOwnerSession(email: string) {
  const allowedEmail = getAllowedEmail();
  if (!allowedEmail || email.trim().toLowerCase() !== allowedEmail) {
    throw new Error('Google account is not allowed');
  }

  const payload = Buffer.from(JSON.stringify({
    email: allowedEmail,
    exp: Math.floor(Date.now() / 1000) + OWNER_SESSION_MAX_AGE_SECONDS,
  })).toString('base64url');

  return `${payload}.${sign(payload)}`;
}

export function verifyOwnerSession(cookieHeader: string | undefined) {
  const allowedEmail = getAllowedEmail();
  if (!allowedEmail || !cookieHeader) return false;

  const prefix = `${OWNER_SESSION_COOKIE}=`;
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  const token = cookie?.slice(prefix.length) ?? '';
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return false;

  let expectedSignature: string;
  try {
    expectedSignature = sign(payload);
  } catch {
    return false;
  }

  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { email?: unknown; exp?: unknown };
    return typeof session.email === 'string'
      && session.email === allowedEmail
      && typeof session.exp === 'number'
      && Number.isFinite(session.exp)
      && session.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function ownerSessionCookie(token: string) {
  return `${OWNER_SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${OWNER_SESSION_MAX_AGE_SECONDS}`;
}

export function clearOwnerSessionCookie() {
  return `${OWNER_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
