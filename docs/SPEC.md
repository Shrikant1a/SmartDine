# SmartDine — Product & Technical Specification

## 1. Overview
SmartDine is a single-restaurant QR-based food ordering and restaurant management platform built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

Customers scan a unique table QR code, browse the live menu, customize variants/add-ons, place orders, track live status (`new` -> `preparing` -> `ready` -> `served`), call a waiter, view restaurant Wi-Fi details, pay (Razorpay online, Cash at Table, Pay at Counter), and leave a review.

Restaurant staff operate role-specific interfaces:
- **Owner**: Full restaurant configuration, menu, tables/QR, staff, orders, payments, reports, and audit logs.
- **Manager**: Daily operations, menu availability, tables, orders, and operational oversight.
- **Kitchen Staff**: Live Kitchen Display System (KDS) with New / Preparing / Ready columns, audio/visual alerts, and status transitions.
- **Waiter**: Table service view, waiter call alerts, and Served status updates.

## 2. Core Engineering Rules
1. Single-restaurant v1 design, with `restaurant_id` included on core tables for clean relational boundaries.
2. All prices, taxes (GST), variant/add-on totals, and stock validations are computed strictly on the server.
3. Row Level Security (RLS) is enabled on all 14 database tables and enforced alongside server-side role checks.
4. QR codes carry high-entropy cryptographic tokens; only HMAC-SHA256 hashes are stored in `restaurant_tables.qr_token_hash`.
5. Historical orders preserve immutable price, variant, add-on, and tax snapshots in `order_items`.
6. Payment confirmation happens strictly through verified server webhooks (Phase 5), never by trusting client redirect parameters.

## 3. Build Phases
- **Phase 0**: Project foundation, Supabase clients, 14-table schema, RLS policies, repeatable seed data, staff auth, controlled owner bootstrap, RBAC, and route skeletons.
- **Phase 1**: Customer QR access, menu, item details, cart, and order placement.
- **Phase 2**: Kitchen Display System (KDS) with Supabase Realtime and audio/visual alerts.
- **Phase 3**: Owner/Manager dashboard (analytics, menu CRUD, table & QR management, staff & orders).
- **Phase 4**: Customer live order tracking, Call Waiter, and Waiter dashboard.
- **Phase 5**: Razorpay online payments, webhooks, refunds, and cash payment settlement.
- **Phase 6**: WhatsApp Business Cloud API notifications, logs, low-stock alerts, daily summaries, and reviews.
- **Phase 7**: End-to-end QA, security audit, responsiveness, performance, and production pilot rollout.
