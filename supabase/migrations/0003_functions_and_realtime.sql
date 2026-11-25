-- ==============================================================================
-- SmartDine Migration 0003: Order Transition Enforcement, Public RPC & Realtime
-- ==============================================================================

-- 1. Enforce valid order status transitions & role-level restrictions in DB
CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Valid state machine transitions
  IF OLD.status = 'new' AND NEW.status NOT IN ('preparing', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid order status transition from % to %', OLD.status, NEW.status;
  ELSIF OLD.status = 'preparing' AND NEW.status NOT IN ('ready', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid order status transition from % to %', OLD.status, NEW.status;
  ELSIF OLD.status = 'ready' AND NEW.status NOT IN ('served', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid order status transition from % to %', OLD.status, NEW.status;
  ELSIF OLD.status IN ('served', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot transition completed or cancelled order from % to %', OLD.status, NEW.status;
  END IF;

  -- Role-specific enforcement when updated by an authenticated Supabase user
  IF auth.uid() IS NOT NULL THEN
    v_role := public.current_staff_role();

    IF v_role = 'kitchen' THEN
      IF NOT ((OLD.status = 'new' AND NEW.status = 'preparing') OR (OLD.status = 'preparing' AND NEW.status = 'ready')) THEN
        RAISE EXCEPTION 'Kitchen role is only permitted to transition orders new -> preparing -> ready';
      END IF;
    ELSIF v_role = 'waiter' THEN
      IF NOT (OLD.status = 'ready' AND NEW.status = 'served') THEN
        RAISE EXCEPTION 'Waiter role is only permitted to mark ready orders as served';
      END IF;
    ELSIF v_role NOT IN ('owner', 'manager') THEN
      RAISE EXCEPTION 'Unauthorized role for order status update';
    END IF;
  END IF;

  -- Automatically stamp lifecycle timestamps
  IF NEW.status = 'preparing' AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at := now();
  ELSIF NEW.status = 'ready' AND NEW.ready_at IS NULL THEN
    NEW.ready_at := now();
  ELSIF NEW.status = 'served' AND NEW.served_at IS NULL THEN
    NEW.served_at := now();
  ELSIF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN
    NEW.cancelled_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_status_transition
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_order_status_transition();

-- 2. Safe public restaurant branding RPC (never leaks WhatsApp numbers, GSTIN, or Wi-Fi)
CREATE OR REPLACE FUNCTION public.get_public_restaurant_info()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  logo_url TEXT,
  description TEXT,
  address TEXT,
  default_gst_percent NUMERIC(5,2),
  google_review_url TEXT,
  is_open BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.name,
    r.slug,
    r.logo_url,
    r.description,
    r.address,
    r.default_gst_percent,
    r.google_review_url,
    r.is_open
  FROM public.restaurants r
  ORDER BY r.created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_restaurant_info() TO anon, authenticated;

-- 3. Generate formatted order number helper
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_seq BIGINT;
BEGIN
  v_seq := nextval('public.order_number_seq');
  RETURN 'SD-' || to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYYMMDD') || '-' || lpad(v_seq::TEXT, 4, '0');
END;
$$;

-- 4. Enable Supabase Realtime publication for live operational tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.waiter_calls;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
