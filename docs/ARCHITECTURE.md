# SmartDine — System Architecture

## 1. Unified Codebase & Route Groups
SmartDine runs as a single Next.js 16 App Router application with clear route boundaries:
- `(customer)` — Mobile-first customer experience (`/menu/[token]`, `/cart`, `/checkout`, `/order/[id]`, `/review/[orderId]`).
- `(auth)` — Staff authentication (`/login`, `/unauthorized`, `/bootstrap`).
- `(kitchen)` — Tablet/desktop Kitchen Display System (`/kitchen`).
- `(waiter)` — Waiter service & call management (`/waiter`).
- `(owner)` — Owner/Manager administration sidebar (`/admin`, `/admin/menu`, `/admin/categories`, `/admin/tables`, `/admin/orders`, `/admin/staff`, `/admin/reports`, `/admin/feedback`, `/admin/settings`).

## 2. Authentication & Authorization Model
1. **Staff Authentication**: Powered by Supabase Auth (`@supabase/ssr`) with cookie-backed server sessions refreshed via Next.js 16 `proxy.ts`.
2. **Role Resolution**: Every authenticated staff request resolves `auth.uid()` against `public.staff` (`is_active = true`) to determine the staff member's `role` (`owner`, `manager`, `kitchen`, `waiter`).
3. **Controlled Owner Bootstrap**: Public staff self-registration does not exist. `/bootstrap` and `POST /api/auth/bootstrap` allow creating the first `owner` account **only** when `OWNER_BOOTSTRAP_SECRET` matches and zero active owners exist in `public.staff`.
4. **Defense in Depth**:
   - `src/proxy.ts` performs fast session cookie refresh and optimistic redirects for protected routes.
   - Server Components and Route Handlers call `requireStaffRole([...])` before rendering sensitive data or mutating state.
   - PostgreSQL Row Level Security (RLS) enforces access boundaries even against direct Supabase REST calls.

## 3. Customer Table Session Security
- Physical table stands encode `/menu/<RAW_TOKEN>`.
- The server computes `HMAC-SHA256(QR_TOKEN_SECRET, RAW_TOKEN)` and matches it against `restaurant_tables.qr_token_hash` where `is_active = true`.
- Once verified, the server issues an `HttpOnly`, `SameSite=Lax` HMAC-signed cookie (`sd_table_session`) containing `{ tableId, restaurantId, tokenVersion, exp }`.
- Customers cannot switch tables via query params or client state tampering. Regenerating a table's QR token increments `token_version` and replaces `qr_token_hash`, immediately invalidating lost or copied stands.

## 4. Next.js 16 Cache Components Compatibility
With `cacheComponents: true` enabled in `next.config.ts`, components that call request-time APIs (`cookies()`, `headers()`) are wrapped inside `<Suspense>` boundaries so static shells prerender cleanly while session-verified views stream safely at request time.
