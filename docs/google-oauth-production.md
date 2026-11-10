# Google OAuth production setup

## Pull request description

### Summary
- Add one-time OAuth `state` validation using short-lived, HTTP-only, secure, SameSite=Lax cookies.
- Add PKCE (S256) and validate the verifier during the token exchange.
- Validate the configured HTTPS callback URL and use it consistently for authorization and token exchange.
- Fetch verified account email with a Bearer token, avoid putting access tokens in URLs, and avoid logging provider response bodies.
- Validate the 32-byte encryption key and store refresh tokens using AES-256-GCM with a versioned ciphertext format.
- Clear temporary OAuth cookies on callback responses and disable response caching.

### Security notes
- Do not merge or enable production OAuth until the production secrets, database, OAuth consent-screen configuration, and database table have been verified.
- This endpoint stores credentials but does not implement application-user authentication or an account-ownership/administrator authorization check. Restrict who can initiate account linking before using it for a public production app.
- The ciphertext format changes to `v1:<iv hex>:<authentication tag hex>:<ciphertext hex>`. Any code that later decrypts stored tokens must support this format. Re-authorize accounts if any previous ciphertext must be migrated; do not silently treat old CBC ciphertext as GCM.

## Production setup checklist

Use one stable production domain, not a deployment-specific Preview URL.

1. Confirm the production domain points to the Vercel project and that `main` is the production branch.
2. In Google Cloud Console, open the correct OAuth 2.0 Web application client. Under **Authorized redirect URIs**, add exactly:

   `https://vtuber-hub-two.vercel.app/api/google/callback`

   The URI must match exactly, including HTTPS, host, path, and trailing-slash behavior. The **Authorized JavaScript origins** setting is not a substitute for this redirect URI.
3. In Vercel **Settings → Environment Variables**, add these for **Production** only (unless separately needed in Preview):
   - `GOOGLE_CLIENT_ID`: OAuth client ID from the same Google Cloud OAuth client.
   - `GOOGLE_CLIENT_SECRET`: client secret from that OAuth client. Keep it secret; never use a `VITE_` prefix.
   - `GOOGLE_REDIRECT_URI`: `https://vtuber-hub-two.vercel.app/api/google/callback`
   - `TOKEN_ENCRYPTION_KEY`: generate a fresh 32-byte key, e.g. `openssl rand -base64 32`; store the output securely and do not rotate it without a token re-encryption/migration plan.
   - `DATABASE_URL`: production PostgreSQL connection string from the database provider; keep it secret.
4. Verify the production database has the required `google_oauth_tokens` table, a unique constraint on `account_id`, and appropriate access controls/backups. The table must exist before callback testing.
5. Save the variables and deploy the reviewed commit to Vercel Production. Environment variable changes require a new deployment.
6. Before authorizing, confirm the production deployment includes the reviewed OAuth code and that account linking is protected by the app's intended access-control policy. A direct visit to `/api/google/callback` without an OAuth response should fail safely; it is not a complete end-to-end test.
7. Test only with an account you control. Confirm the consent screen lists the intended YouTube read-only scopes and review Google OAuth verification/testing requirements for the app's user type and audience.
8. Check Vercel function logs for errors without copying secrets, authorization codes, access tokens, or refresh tokens into tickets or chat.

## Important operational notes

- Never commit OAuth secrets, database credentials, encryption keys, authorization codes, or tokens to GitHub.
- Keep `TOKEN_ENCRYPTION_KEY` backed up securely. Losing it makes stored refresh tokens unusable; changing it requires migration or user re-authorization.
- The OAuth routes currently persist refresh tokens by verified email. Confirm this matches the product's account model before production use.
