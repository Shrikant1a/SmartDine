# SmartDine — Smart Restaurant QR Ordering & Management System

SmartDine is a single-restaurant, QR-based food ordering and restaurant management platform built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, **Supabase (PostgreSQL, Auth, Realtime, Storage)**, **Razorpay**, and **WhatsApp Business Cloud API**.

## Project Documentation
- [Product & Technical Specification](docs/SPEC.md)
- [System Architecture & Security](docs/ARCHITECTURE.md)
- [Database Schema & RLS Matrix](docs/DATABASE.md)
- [WhatsApp Business Cloud API Setup](docs/WHATSAPP_SETUP.md)
- [Production Deployment & Pilot Checklist](docs/DEPLOYMENT.md)
- [CI/CD Pipeline Guide](docs/CICD.md)

## Quick Start (Phase 0)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and populate your Supabase project credentials and generated secrets:
```bash
cp .env.example .env.local
```

Generate high-entropy local secrets (32+ chars) for:
- `QR_TOKEN_SECRET`
- `TABLE_SESSION_SECRET`
- `OWNER_BOOTSTRAP_SECRET`

Never commit `.env.local` or any private keys.

### 3. Apply Database Migrations
Apply the SQL migrations in order inside your Supabase SQL Editor or via Supabase CLI:
1. `supabase/migrations/0001_initial_schema.sql` — All 14 core tables, constraints, indexes, and triggers.
2. `supabase/migrations/0002_rls_policies.sql` — Enables RLS on all 14 tables with role-scoped policies.
3. `supabase/migrations/0003_functions_and_realtime.sql` — Order transition guard triggers, safe public RPC, and Realtime publication.
4. `supabase/migrations/0004_order_creation_rpc.sql` — Atomic server-side order creation, pricing, GST, and stock deduction RPC.
5. `supabase/migrations/0005_storage_bucket.sql` — Public `menu-images` Supabase Storage bucket and owner/manager upload policies.
6. `supabase/migrations/0006_whatsapp_consent.sql` — Adds `whatsapp_consent` boolean flag on `orders`.
7. `supabase/migrations/0007_security_and_performance_hardening.sql` — Revokes public RPC execution on internal helpers/triggers and adds covering FK indexes.

For WhatsApp Business Cloud API template setup, see [WhatsApp Setup Guide](docs/WHATSAPP_SETUP.md).

### 4. Seed Demo Data (Repeatable)
Run `supabase/seed.sql` in the SQL Editor **or** run the idempotent TypeScript seed script (recommended once `QR_TOKEN_SECRET` is set so table tokens use your HMAC secret):
```bash
npm run seed
```
This seeds:
- 1 restaurant (`SmartDine Bistro`)
- 5 categories (`Starters`, `Indian Food`, `Pizza and Burger`, `Beverages`, `Desserts`)
- 8 menu items (including `Paneer Pizza` with Small/Medium/Large variants & add-ons)
- 5 restaurant tables (`T1`–`T5`) with hashed QR tokens

### 5. Bootstrap the Initial Owner Account
1. Start the dev server: `npm run dev`
2. Open `http://localhost:3000/bootstrap`
3. Enter your `OWNER_BOOTSTRAP_SECRET`, restaurant name, owner name, email, and password.
4. Once an active `owner` exists, `/bootstrap` and `POST /api/auth/bootstrap` automatically lock.
5. Sign in at `http://localhost:3000/login`.

## Verification & Quality Checks
```bash
npm run typecheck    # TypeScript strict check
npm run lint         # ESLint check
npm test             # Vitest unit tests (RBAC, QR security, Zod, rate limiting)
npm run build        # Production Next.js build
npm run verify:rls   # Live RLS negative verification (requires Supabase .env.local)
```

## Available Portals
- `/` — Platform overview & links
- `/menu/[token]` — Customer QR menu route
- `/login` — Staff authentication
- `/bootstrap` — One-time controlled owner provisioning
- `/kitchen` — Kitchen Display System (`owner`, `manager`, `kitchen`)
- `/waiter` — Waiter portal (`owner`, `manager`, `waiter`)
- `/admin` — Owner & Manager dashboard (`owner`, `manager`)
- `/api/health` — Environment and database connectivity check
