# Owner-only YouTube analytics dashboard

## What this branch changes

- Successful Google OAuth now stores the encrypted refresh token, creates a signed seven-day owner session cookie, and redirects to `/?connected=1`.
- The homepage prompts for the owner Google login when no valid owner session exists.
- YouTube dashboard figures are loaded from YouTube Data API v3 and YouTube Analytics API; sample analytics are not shown.
- The YouTube analytics and Gemini API routes require a valid owner session. Logout clears that session.
- Metrics shown are public channel subscriber count (when visible), lifetime views, video count, and daily views/watch time for the most recent 28 complete days. Revenue/live concurrent viewers are intentionally not fabricated or displayed.

## Required Vercel Production environment variables

Keep existing OAuth/DB variables and add:

- `GOOGLE_ALLOWED_EMAIL`: the exact owner email, e.g. `hiyoritan730@gmail.com`
- `SESSION_SECRET`: a cryptographically random secret of at least 32 bytes. Generate locally with `openssl rand -base64 32` and store only in Vercel; do not share it.

The existing variables `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `DATABASE_URL`, and `TOKEN_ENCRYPTION_KEY` are still required. `GOOGLE_REDIRECT_URI` must remain the production callback URL.

## Google Cloud setup

Enable YouTube Data API v3 and YouTube Analytics API in the same Google Cloud project as the OAuth client. The login flow requests the read-only scopes for channel and analytics data. Keep the OAuth audience/test-user configuration restricted to the owner account during testing.

## Deploy and verify

1. Review and merge this branch's pull request to `main`; confirm the Vercel Production deployment is Ready.
2. Add the environment variables above in Vercel Production, then redeploy after changing them.
3. Open the production homepage. Without a session it should show only the login prompt.
4. Use the homepage login button. After successful authorization it should return to `/` and show live API data.
5. Check `/api/auth/session` reports authenticated in the browser (do not share cookies). Check `/api/youtube/overview` returns actual metrics while logged in and 401 after logout.
6. Use the logout button; the dashboard should return to the login prompt. Unauthenticated direct API calls must return 401.

The owner session expires after seven days; logging in again renews it. Never paste OAuth callback URLs, authorization codes, cookies, or any secret values into chat/issues.
