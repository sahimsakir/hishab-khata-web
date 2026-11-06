# Deploy HishabKhata Web on Vercel

Import `sahimsakir/hishab-khata-web` with repository root `.` and framework **Vite**. `vercel.json` sets `npm ci`, `npm run build`, output `dist`, and SPA deep-link fallback. API paths are deliberately excluded from the SPA fallback.

Before a functional deployment, set the real API routing and build-time environment:

- `VITE_API_BASE_URL`: the actual HTTPS API origin, or empty only when a working same-origin `/api` proxy exists.
- `VITE_GOOGLE_AUTH_URL`: the real public Google sign-in initiation URL.
- `VITE_GOOGLE_LINK_URL`: the real public Google account-link URL.

Do not use localhost URLs in a production deployment. Do not put secrets or Passport access tokens in any VITE variable.

A static frontend deployment alone cannot log in, save transactions, or run reports without the Laravel API and PostgreSQL database. Independent `*.vercel.app` project origins are cross-site: SameSite=Lax cookies need same-site custom domains or a properly configured same-origin API/OAuth proxy. Keep the Laravel frontend URL, CORS origin, cookie settings, and Google redirect URI consistent with the final production routing.

After changing VITE variables, rebuild/redeploy. Verify refreshes on `/login`, `/loans`, `/accounts`, and `/auth/callback`.
