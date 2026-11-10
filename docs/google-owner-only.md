# Google OAuth private-owner restriction

- Set `GOOGLE_ALLOWED_EMAIL` to your own email in Vercel Production environment variables.
- Example: `hiyoritan730@gmail.com`
- The callback will reject any Google account whose verified email does not exactly match that value.
- This is a simple owner-only restriction for a personal app. It does not replace a broader app-authentication layer for public apps.

Example Vercel value:

```text
GOOGLE_ALLOWED_EMAIL=hiyoritan730@gmail.com
```

If you want to lock the whole app down further, add a separate check before serving the app itself, but the OAuth callback check is the minimum owner-only restriction for this flow.
