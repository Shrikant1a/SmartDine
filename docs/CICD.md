# SmartDine — CI/CD Pipeline Guide

SmartDine uses two GitHub Actions workflows in `.github/workflows/`:

1. **Continuous Integration ([`ci.yml`](../.github/workflows/ci.yml))** — Runs on every push and pull request to `main` and `develop`:
   - Ensures no `.env` secret files are committed to Git.
   - Runs `npm run typecheck`, `npm run lint`, and `npm test` (Vitest).
   - Verifies migration ordering under `supabase/migrations/`.
   - Runs `npm run build` and `npm run verify:secrets` (scans `.next/static` to guarantee zero server secret names appear in client bundles).
   - Boots the production Next.js server (`npm run verify:ci-smoke`) and runs `tests/integration/http-security-smoke.ts` against live routes.

2. **Continuous Deployment ([`cd.yml`](../.github/workflows/cd.yml))** — Runs on push to `main` or manual dispatch (`preview` / `production`):
   - **Pre-Deploy Gate**: Re-runs typecheck, lint, unit tests, production build, and client-bundle secret scan.
   - **Supabase Migrations (`deploy-supabase-migrations`)**: Applies pending SQL migrations via `supabase db push` when Supabase GitHub secrets are configured.
   - **Vercel Deployment (`deploy-vercel`)**: Builds and deploys to Vercel (Preview or Production) and runs a post-deploy check against `/api/health` and `/admin`.

## Required GitHub Repository Secrets & Variables

### Repository Variables (`Settings -> Secrets and variables -> Actions -> Variables`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

### Repository Secrets (`Settings -> Secrets and variables -> Actions -> Secrets`)
For **Supabase Automated Migrations**:
- `SUPABASE_ACCESS_TOKEN` — Supabase Personal Access Token
- `SUPABASE_PROJECT_REF` — Project Reference ID
- `SUPABASE_DB_PASSWORD` — Database password

For **Vercel Deployment**:
- `VERCEL_TOKEN` — Vercel API token
- `VERCEL_ORG_ID` — Team/User org ID
- `VERCEL_PROJECT_ID` — Vercel project ID

> **Security Note**: Runtime application secrets (`SUPABASE_SERVICE_ROLE_KEY`, `QR_TOKEN_SECRET`, `TABLE_SESSION_SECRET`, `RAZORPAY_*`, `WHATSAPP_*`, `CRON_SECRET`) live exclusively inside Vercel Environment Variables (separated by Preview vs Production) and are never needed in CI build logs.
