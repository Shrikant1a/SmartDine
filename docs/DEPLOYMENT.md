# SmartDine — Production Deployment & Pilot Launch Checklist

## 1. Supabase Production Setup
1. Create a dedicated production Supabase project in the closest region (e.g., Mumbai `ap-south-1`).
2. Apply all migrations in order (`supabase/migrations/0001` through `0006`):
   - `0001_initial_schema.sql`
   - `0002_rls_policies.sql`
   - `0003_functions_and_realtime.sql`
   - `0004_order_creation_rpc.sql`
   - `0005_storage_bucket.sql`
   - `0006_whatsapp_consent.sql`
3. Enable daily automated PostgreSQL backups and test a point-in-time restore drill before go-live.
4. Run `npm run verify:rls` against the production project (using `anon` key) to confirm protected tables deny anonymous reads.

## 2. Vercel Hosting & Environment Separation
Configure separate **Preview/Development** (Razorpay Test keys `rzp_test_*`) and **Production** (Razorpay Live keys `rzp_live_*`) environment variables in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (`https://your-restaurant-domain.com`)
- `SUPABASE_SERVICE_ROLE_KEY` (Server-only)
- `QR_TOKEN_SECRET` (64+ char unique random secret; never share between dev and prod)
- `TABLE_SESSION_SECRET` (64+ char unique random secret)
- `OWNER_BOOTSTRAP_SECRET` (Temporary secret used once at `/bootstrap`, then remove or rotate after owner creation)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- `CRON_SECRET` (Used by Vercel Cron in `vercel.json` at `17:30 UTC` / `11:00 PM IST` for `/api/notifications/daily-summary`)

> **Never** use `rzp_live_*` keys in local `.env.local` or staging environments.

## 3. Razorpay & WhatsApp Onboarding
- **Razorpay**: Complete KYC verification; configure Webhook URL `https://your-domain.com/api/payments/webhook` subscribed to `payment.captured`, `order.paid`, `payment.failed`, and `refund.processed`.
- **WhatsApp**: Complete Meta Business verification and submit the 4 templates documented in [WHATSAPP_SETUP.md](WHATSAPP_SETUP.md).

## 4. Real-Restaurant Pilot Rollout (1–2 Weeks)
1. Provision the Owner account via `/bootstrap`, then sign in at `/login`.
2. Configure restaurant name, GSTIN, default GST %, guest Wi-Fi credentials, and Google Review link in `/admin/settings`.
3. Add categories and menu items with real photography and stock thresholds in `/admin/menu`.
4. Create initial pilot tables (`T1`–`T4`) in `/admin/tables`, print laminated/acrylic QR stands (including printed table number fallback text), and test scanning from mobile devices.
5. Set up a dedicated Kitchen tablet with `/kitchen` installed as a PWA (`Add to Home Screen`), tap **Enable Sound Alerts**, and keep a mobile hotspot + paper KOT pad as outage fallback.
6. Create separate `kitchen` and `waiter` staff accounts in `/admin/staff` and test end-to-end ordering, KDS transitions, Waiter calls, Cash & Razorpay payments, and CSV exports before expanding to all tables.
