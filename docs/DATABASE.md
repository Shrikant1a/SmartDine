# SmartDine — Database Design & RLS Matrix

## 1. Core Tables (14)
1. `restaurants` — Single-restaurant branding, GST defaults, Wi-Fi credentials, WhatsApp numbers, Google Review URL.
2. `staff` — Links `auth.users(id)` to `restaurants(id)` with role (`owner`, `manager`, `kitchen`, `waiter`), permissions JSON, and `is_active`.
3. `restaurant_tables` — Physical tables, capacity, status, `qr_token_hash`, and `token_version`.
4. `categories` — Menu categories with sort order and active flag.
5. `menu_items` — Food items with `base_price` (`NUMERIC(10,2)`), `gst_percent`, `is_veg`, `is_available`, `is_archived`, `stock_qty`, and `low_stock_threshold`.
6. `menu_item_variants` — Item size/portion variants (e.g., Small/Medium/Large) with `NUMERIC(10,2)` price.
7. `menu_item_addons` — Optional paid extras (e.g., Extra Cheese) with `NUMERIC(10,2)` price.
8. `orders` — Order header (`order_number`, `status`, `payment_mode`, `payment_status`, monetary breakdown, `idempotency_key`, timestamps).
9. `order_items` — Immutable line-item snapshots (`item_name_snapshot`, `variant_name_snapshot`, `addons_snapshot`, `unit_price_snapshot`, `gst_percent_snapshot`, `quantity`, `line_total`).
10. `payments` — Payment provider records (`razorpay`, `cash`, `counter`) with unique `provider_order_id`, `provider_payment_id`, and `provider_event_id` for webhook idempotency.
11. `waiter_calls` — Table assistance requests (`open`, `acknowledged`, `resolved`).
12. `reviews` — Post-service ratings (`1..5`) and optional feedback (`UNIQUE(order_id)`).
13. `notification_logs` — WhatsApp notification audit/retry records.
14. `audit_logs` — Append-only staff action trail.

## 2. RLS Policy Summary

| Table | `anon` (Public) | `kitchen` | `waiter` | `manager` | `owner` |
|---|---|---|---|---|---|
| `restaurants` | None (use safe RPC) | None (use safe RPC) | None (use safe RPC) | SELECT | SELECT, UPDATE |
| `staff` | None | Own row SELECT | Own row SELECT | SELECT (restaurant) | Full CRUD (restaurant) |
| `restaurant_tables` | None | SELECT | SELECT | Full CRUD | Full CRUD |
| `categories` | SELECT (`is_active`) | SELECT | SELECT | Full CRUD | Full CRUD |
| `menu_items` | SELECT (`!is_archived`) | SELECT | SELECT | Full CRUD | Full CRUD |
| `menu_item_variants` | SELECT (non-archived item) | SELECT | SELECT | Full CRUD | Full CRUD |
| `menu_item_addons` | SELECT (non-archived item) | SELECT | SELECT | Full CRUD | Full CRUD |
| `orders` | None (server route/RPC) | SELECT, UPDATE (`new->preparing->ready`) | SELECT, UPDATE (`ready->served`) | SELECT, INSERT, UPDATE | SELECT, INSERT, UPDATE |
| `order_items` | None | SELECT | SELECT | SELECT, INSERT | SELECT, INSERT |
| `payments` | None | None | None | SELECT | SELECT, INSERT, UPDATE |
| `waiter_calls` | None | SELECT | SELECT, UPDATE | SELECT, UPDATE | SELECT, INSERT, UPDATE |
| `reviews` | None | None | None | SELECT, UPDATE | SELECT, UPDATE |
| `notification_logs` | None | None | None | SELECT | SELECT |
| `audit_logs` | None | None | None | None | SELECT (append-only) |

> **Important**: Server-side routes using `SUPABASE_SERVICE_ROLE_KEY` bypass RLS only after validating signed customer table/order cookies or staff RBAC guards.
