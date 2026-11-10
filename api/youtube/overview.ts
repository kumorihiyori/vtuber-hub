import { verifyOwnerSession } from '../_lib/owner-session.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const databaseUrl = process.env.DATABASE_URL;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const ownerEmail = process.env.GOOGLE_ALLOWED_EMAIL?.trim().toLowerCase();
  if (!databaseUrl || !clientId || !clientSecret || !ownerEmail) {
    return res.status(500).json({ error: 'YouTube integration is not configured.' });
  }

  if (!verifyOwnerSession(req.headers?.cookie)) {
    return res.status(401).json({ error: 'Please connect the authorized Google account.' });
  }

  const { Client } = await import('pg');
  const crypto = await import('node:crypto');
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    const tokenResult = await client.query(
      'SELECT refresh_token_ciphertext FROM google_oauth_tokens WHERE account_id = $1',
      [ownerEmail],
    );

    if (!tokenResult.rows.length || typeof tokenResult.rows[0].refresh_token_ciphertext !== 'string') {
      return res.status(404).json({ error: 'No connected YouTube account was found. Please connect Google again.' });
    }

    const encryptedText = tokenResult.rows[0].refresh_token_ciphertext;
    const encodedKey = process.env.TOKEN_ENCRYPTION_KEY;
    if (!encodedKey) throw new Error('TOKEN_ENCRYPTION_KEY is missing');
    const key = Buffer.from(encodedKey, 'base64');
    if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must decode to 32 bytes');
    const [version, ivHex, authTagHex, encryptedHex] = encryptedText.split(':');
    if (version !== 'v1' || !ivHex || !authTagHex || !encryptedHex) throw new Error('Stored token format is invalid');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const refreshToken = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || typeof tokenData.access_token !== 'string') {
      console.error('Google refresh failed with status:', tokenResponse.status);
      return res.status(401).json({ error: 'Google authorization expired. Please connect Google again.' });
    }

    const authHeaders = { Authorization: `Bearer ${tokenData.access_token}` };
    const channelResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      { headers: authHeaders },
    );
    if (!channelResponse.ok) {
      console.error('YouTube Data API returned status:', channelResponse.status);
      return res.status(502).json({ error: 'YouTube channel data could not be loaded. Check that YouTube Data API v3 is enabled.' });
    }

    const channelData = await channelResponse.json();
    const channel = channelData.items?.[0];
    if (!channel) return res.status(404).json({ error: 'No YouTube channel was found for this Google account.' });

    const end = new Date();
    end.setUTCDate(end.getUTCDate() - 2);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 27);

    const analyticsUrl = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
    analyticsUrl.search = new URLSearchParams({
      ids: 'channel==MINE',
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      metrics: 'views,estimatedMinutesWatched',
      dimensions: 'day',
      sort: 'day',
    }).toString();

    const analyticsResponse = await fetch(analyticsUrl, { headers: authHeaders });
    if (!analyticsResponse.ok) {
      console.error('YouTube Analytics API returned status:', analyticsResponse.status);
      return res.status(502).json({ error: 'YouTube Analytics data could not be loaded. Check that YouTube Analytics API is enabled and authorized.' });
    }

    const analyticsData = await analyticsResponse.json();
    const daily = (analyticsData.rows ?? []).map((row: any) => ({
      date: row[0],
      views: Number(row[1]),
      minutesWatched: Number(row[2]),
    }));

    const stats = channel.statistics ?? {};
    return res.status(200).json({
      channelTitle: channel.snippet?.title ?? 'YouTube channel',
      subscriberCount: stats.hiddenSubscriberCount ? null : Number(stats.subscriberCount ?? 0),
      viewCount: Number(stats.viewCount ?? 0),
      videoCount: Number(stats.videoCount ?? 0),
      periodStart: start.toISOString().slice(0, 10),
      periodEnd: end.toISOString().slice(0, 10),
      periodViews: daily.reduce((total: number, item: any) => total + item.views, 0),
      periodMinutesWatched: daily.reduce((total: number, item: any) => total + item.minutesWatched, 0),
      daily,
    });
  } finally {
    await client.end().catch(() => undefined);
  }
}
