-- ==============================================================================
-- SmartDine Migration 0001: Core Schema (14 Tables, Constraints, Indexes, Triggers)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Sequence for human-readable sequential order numbers
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1001;

-- ------------------------------------------------------------------------------
-- 1. restaurants
-- ------------------------------------------------------------------------------
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  address TEXT,
  phone TEXT,
  gst_number TEXT,
  default_gst_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (default_gst_percent >= 0 AND default_gst_percent <= 28),
  service_charge_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (service_charge_percent >= 0 AND service_charge_percent <= 20),
  wifi_ssid TEXT,
  wifi_password TEXT,
  google_review_url TEXT,
  owner_whatsapp TEXT,
  kitchen_whatsapp TEXT,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 2. staff
-- ------------------------------------------------------------------------------
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'kitchen', 'waiter')),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, email)
);

CREATE INDEX idx_staff_restaurant_role ON public.staff (restaurant_id, role, is_active);
CREATE INDEX idx_staff_user_id ON public.staff (user_id);

CREATE TRIGGER trg_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 3. restaurant_tables
-- ------------------------------------------------------------------------------
CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  label TEXT,
  capacity INT NOT NULL DEFAULT 4 CHECK (capacity > 0 AND capacity <= 50),
  qr_token_hash TEXT NOT NULL UNIQUE,
  token_version INT NOT NULL DEFAULT 1 CHECK (token_version >= 1),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'inactive')),
  assigned_waiter_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, table_number)
);

CREATE INDEX idx_restaurant_tables_qr_hash ON public.restaurant_tables (qr_token_hash);
CREATE INDEX idx_restaurant_tables_active ON public.restaurant_tables (restaurant_id, is_active);

CREATE TRIGGER trg_restaurant_tables_updated_at
  BEFORE UPDATE ON public.restaurant_tables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 4. categories
-- ------------------------------------------------------------------------------
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, name)
);

CREATE INDEX idx_categories_restaurant_sort ON public.categories (restaurant_id, is_active, sort_order);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 5. menu_items
-- ------------------------------------------------------------------------------
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  base_price NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
  gst_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (gst_percent >= 0 AND gst_percent <= 28),
  is_veg BOOLEAN NOT NULL DEFAULT true,
  is_recommended BOOLEAN NOT NULL DEFAULT false,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  stock_qty INT CHECK (stock_qty IS NULL OR stock_qty >= 0),
  low_stock_threshold INT NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  prep_time_mins INT NOT NULL DEFAULT 15 CHECK (prep_time_mins >= 1),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, category_id, name)
);

CREATE INDEX idx_menu_items_category ON public.menu_items (category_id, is_available, is_archived, sort_order);
CREATE INDEX idx_menu_items_restaurant_avail ON public.menu_items (restaurant_id, is_available, is_archived);

CREATE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 6. menu_item_variants
-- ------------------------------------------------------------------------------
CREATE TABLE public.menu_item_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, name)
);

CREATE INDEX idx_menu_item_variants_item ON public.menu_item_variants (menu_item_id, sort_order);

CREATE TRIGGER trg_menu_item_variants_updated_at
  BEFORE UPDATE ON public.menu_item_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 7. menu_item_addons
-- ------------------------------------------------------------------------------
CREATE TABLE public.menu_item_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, name)
);

CREATE INDEX idx_menu_item_addons_item ON public.menu_item_addons (menu_item_id, sort_order);

CREATE TRIGGER trg_menu_item_addons_updated_at
  BEFORE UPDATE ON public.menu_item_addons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 8. orders
-- ------------------------------------------------------------------------------
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE RESTRICT,
  table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE RESTRICT,
  order_number TEXT NOT NULL,
  idempotency_key TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready', 'served', 'cancelled')),
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('online', 'cash_table', 'counter')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
  service_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (service_charge >= 0),
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  customer_name TEXT,
  customer_phone TEXT,
  special_instructions TEXT,
  accepted_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, order_number)
);

CREATE UNIQUE INDEX idx_orders_idempotency ON public.orders (table_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_orders_restaurant_status_created ON public.orders (restaurant_id, status, created_at DESC);
CREATE INDEX idx_orders_table_created ON public.orders (table_id, created_at DESC);
CREATE INDEX idx_orders_payment_status ON public.orders (restaurant_id, payment_status, created_at DESC);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 9. order_items
-- ------------------------------------------------------------------------------
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name_snapshot TEXT NOT NULL,
  variant_name_snapshot TEXT,
  addons_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  unit_price_snapshot NUMERIC(10,2) NOT NULL CHECK (unit_price_snapshot >= 0),
  addons_total_snapshot NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (addons_total_snapshot >= 0),
  gst_percent_snapshot NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (gst_percent_snapshot >= 0),
  quantity INT NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(10,2) NOT NULL CHECK (line_total >= 0),
  special_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX idx_order_items_menu_item_id ON public.order_items (menu_item_id);

-- ------------------------------------------------------------------------------
-- 10. payments
-- ------------------------------------------------------------------------------
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL CHECK (provider IN ('razorpay', 'cash', 'counter')),
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('online', 'cash_table', 'counter')),
  provider_order_id TEXT UNIQUE,
  provider_payment_id TEXT UNIQUE,
  provider_event_id TEXT UNIQUE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  raw_payload JSONB,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_order_id ON public.payments (order_id);
CREATE INDEX idx_payments_restaurant_status ON public.payments (restaurant_id, status, created_at DESC);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 11. waiter_calls
-- ------------------------------------------------------------------------------
CREATE TABLE public.waiter_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  note TEXT,
  acknowledged_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_waiter_calls_restaurant_status ON public.waiter_calls (restaurant_id, status, created_at DESC);
CREATE INDEX idx_waiter_calls_table_created ON public.waiter_calls (table_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 12. reviews
-- ------------------------------------------------------------------------------
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  allow_edit BOOLEAN NOT NULL DEFAULT false,
  clicked_google_review BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_restaurant_created ON public.reviews (restaurant_id, created_at DESC);

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 13. notification_logs
-- ------------------------------------------------------------------------------
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'system')),
  event_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  template_name TEXT,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  provider_message_id TEXT,
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_logs_restaurant_status ON public.notification_logs (restaurant_id, status, created_at DESC);

-- ------------------------------------------------------------------------------
-- 14. audit_logs
-- ------------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_restaurant_created ON public.audit_logs (restaurant_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
