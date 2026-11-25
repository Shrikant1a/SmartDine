-- ==============================================================================
-- SmartDine Migration 0002: Row Level Security (RLS) Helpers & Policies
-- Every application table has RLS enabled and denies unauthorized access.
-- ==============================================================================

-- Helper: Get active staff role for current authenticated user
CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.role
  FROM public.staff s
  WHERE s.user_id = auth.uid()
    AND s.is_active = true
  LIMIT 1;
$$;

-- Helper: Get active staff restaurant_id for current authenticated user
CREATE OR REPLACE FUNCTION public.current_staff_restaurant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.restaurant_id
  FROM public.staff s
  WHERE s.user_id = auth.uid()
    AND s.is_active = true
  LIMIT 1;
$$;

-- Helper: Check if current authenticated user is active staff in allowed roles
CREATE OR REPLACE FUNCTION public.is_active_staff(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.user_id = auth.uid()
      AND s.is_active = true
      AND s.role = ANY(allowed_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.current_staff_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_staff_role() TO authenticated, anon;

REVOKE ALL ON FUNCTION public.current_staff_restaurant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_staff_restaurant_id() TO authenticated, anon;

REVOKE ALL ON FUNCTION public.is_active_staff(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_staff(TEXT[]) TO authenticated, anon;

-- Enable RLS on ALL 14 tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiter_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 1. restaurants: Owner/Manager only (public branding via safe RPC)
-- ------------------------------------------------------------------------------
CREATE POLICY "Owner and manager can read restaurant"
  ON public.restaurants FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner', 'manager'])
    AND id = public.current_staff_restaurant_id()
  );

CREATE POLICY "Owner can update restaurant"
  ON public.restaurants FOR UPDATE
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner'])
    AND id = public.current_staff_restaurant_id()
  )
  WITH CHECK (
    public.is_active_staff(ARRAY['owner'])
    AND id = public.current_staff_restaurant_id()
  );

-- ------------------------------------------------------------------------------
-- 2. staff: Owner manages all, Manager views, Kitchen/Waiter read own row only
-- ------------------------------------------------------------------------------
CREATE POLICY "Staff can read own profile"
  ON public.staff FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()) AND is_active = true);

CREATE POLICY "Owner and manager can read restaurant staff"
  ON public.staff FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner', 'manager'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

CREATE POLICY "Owner can insert staff"
  ON public.staff FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_staff(ARRAY['owner'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

CREATE POLICY "Owner can update staff"
  ON public.staff FOR UPDATE
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner'])
    AND restaurant_id = public.current_staff_restaurant_id()
  )
  WITH CHECK (
    public.is_active_staff(ARRAY['owner'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

CREATE POLICY "Owner can delete non-owner staff"
  ON public.staff FOR DELETE
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner'])
    AND restaurant_id = public.current_staff_restaurant_id()
    AND role <> 'owner'
  );

-- ------------------------------------------------------------------------------
-- 3. restaurant_tables: Staff only; anon never reads qr_token_hash
-- ------------------------------------------------------------------------------
CREATE POLICY "Active staff can read restaurant tables"
  ON public.restaurant_tables FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner', 'manager', 'kitchen', 'waiter'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

CREATE POLICY "Owner and manager can manage restaurant tables"
  ON public.restaurant_tables FOR ALL
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner', 'manager'])
    AND restaurant_id = public.current_staff_restaurant_id()
  )
  WITH CHECK (
    public.is_active_staff(ARRAY['owner', 'manager'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

-- ------------------------------------------------------------------------------
-- 4. categories: Public active read; Owner/Manager write; Staff read
-- ------------------------------------------------------------------------------
CREATE POLICY "Public can read active categories"
  ON public.categories FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Active staff can read all categories"
  ON public.categories FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner', 'manager', 'kitchen', 'waiter'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

CREATE POLICY "Owner and manager can manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner', 'manager'])
    AND restaurant_id = public.current_staff_restaurant_id()
  )
  WITH CHECK (
    public.is_active_staff(ARRAY['owner', 'manager'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

-- ------------------------------------------------------------------------------
-- 5. menu_items: Public non-archived read; Owner/Manager write; Staff read
-- ------------------------------------------------------------------------------
CREATE POLICY "Public can read non-archived menu items"
  ON public.menu_items FOR SELECT
  TO anon
  USING (is_archived = false);

CREATE POLICY "Active staff can read all menu items"
  ON public.menu_items FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner', 'manager', 'kitchen', 'waiter'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

CREATE POLICY "Owner and manager can manage menu items"
  ON public.menu_items FOR ALL
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner', 'manager'])
    AND restaurant_id = public.current_staff_restaurant_id()
  )
  WITH CHECK (
    public.is_active_staff(ARRAY['owner', 'manager'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

-- ------------------------------------------------------------------------------
-- 6 & 7. menu_item_variants & menu_item_addons
-- ------------------------------------------------------------------------------
CREATE POLICY "Public can read variants of non-archived items"
  ON public.menu_item_variants FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_item_variants.menu_item_id
        AND mi.is_archived = false
    )
  );

CREATE POLICY "Active staff can read variants"
  ON public.menu_item_variants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_item_variants.menu_item_id
        AND mi.restaurant_id = public.current_staff_restaurant_id()
        AND public.is_active_staff(ARRAY['owner', 'manager', 'kitchen', 'waiter'])
    )
  );

CREATE POLICY "Owner and manager can manage variants"
  ON public.menu_item_variants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_item_variants.menu_item_id
        AND mi.restaurant_id = public.current_staff_restaurant_id()
        AND public.is_active_staff(ARRAY['owner', 'manager'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_item_variants.menu_item_id
        AND mi.restaurant_id = public.current_staff_restaurant_id()
        AND public.is_active_staff(ARRAY['owner', 'manager'])
    )
  );

CREATE POLICY "Public can read addons of non-archived items"
  ON public.menu_item_addons FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_item_addons.menu_item_id
        AND mi.is_archived = false
    )
  );

CREATE POLICY "Active staff can read addons"
  ON public.menu_item_addons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_item_addons.menu_item_id
        AND mi.restaurant_id = public.current_staff_restaurant_id()
        AND public.is_active_staff(ARRAY['owner', 'manager', 'kitchen', 'waiter'])
    )
  );

CREATE POLICY "Owner and manager can manage addons"
  ON public.menu_item_addons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_item_addons.menu_item_id
        AND mi.restaurant_id = public.current_staff_restaurant_id()
        AND public.is_active_staff(ARRAY['owner', 'manager'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_item_addons.menu_item_id
        AND mi.restaurant_id = public.current_staff_restaurant_id()
        AND public.is_active_staff(ARRAY['owner', 'manager'])
    )
  );

-- ------------------------------------------------------------------------------
-- 8. orders: No direct anon access; Staff scoped by role
-- ------------------------------------------------------------------------------
CREATE POLICY "Active staff can read restaurant orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner', 'manager', 'kitchen', 'waiter'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

CREATE POLICY "Owner and manager can insert orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_staff(ARRAY['owner', 'manager'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

CREATE POLICY "Authorized staff can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner', 'manager', 'kitchen', 'waiter'])
    AND restaurant_id = public.current_staff_restaurant_id()
  )
  WITH CHECK (
    public.is_active_staff(ARRAY['owner', 'manager', 'kitchen', 'waiter'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

-- ------------------------------------------------------------------------------
-- 9. order_items: No direct anon access; Staff read; Owner/Manager insert
-- ------------------------------------------------------------------------------
CREATE POLICY "Active staff can read order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.restaurant_id = public.current_staff_restaurant_id()
        AND public.is_active_staff(ARRAY['owner', 'manager', 'kitchen', 'waiter'])
    )
  );

CREATE POLICY "Owner and manager can insert order items"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.restaurant_id = public.current_staff_restaurant_id()
        AND public.is_active_staff(ARRAY['owner', 'manager'])
    )
  );

-- ------------------------------------------------------------------------------
-- 10. payments: Owner & Manager read; Owner write; Kitchen/Waiter/Anon denied
-- ------------------------------------------------------------------------------
CREATE POLICY "Owner and manager can read payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner', 'manager'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

CREATE POLICY "Owner can manage payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner'])
    AND restaurant_id = public.current_staff_restaurant_id()
  )
  WITH CHECK (
    public.is_active_staff(ARRAY['owner'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

-- ------------------------------------------------------------------------------
-- 11. waiter_calls: Staff read; Waiter/Manager/Owner update
-- ------------------------------------------------------------------------------
CREATE POLICY "Active staff can read waiter calls"
  ON public.waiter_calls FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner', 'manager', 'kitchen', 'waiter'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

CREATE POLICY "Waiter, manager and owner can update waiter calls"
  ON public.waiter_calls FOR UPDATE
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner', 'manager', 'waiter'])
    AND restaurant_id = public.current_staff_restaurant_id()
  )
  WITH CHECK (
    public.is_active_staff(ARRAY['owner', 'manager', 'waiter'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

-- ------------------------------------------------------------------------------
-- 12. reviews: Owner & Manager only
-- ------------------------------------------------------------------------------
CREATE POLICY "Owner and manager can read and manage reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner', 'manager'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

CREATE POLICY "Owner can update review edit permissions"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner'])
    AND restaurant_id = public.current_staff_restaurant_id()
  )
  WITH CHECK (
    public.is_active_staff(ARRAY['owner'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

-- ------------------------------------------------------------------------------
-- 13. notification_logs: Owner & Manager read only
-- ------------------------------------------------------------------------------
CREATE POLICY "Owner and manager can read notification logs"
  ON public.notification_logs FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner', 'manager'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );

-- ------------------------------------------------------------------------------
-- 14. audit_logs: Owner read only (append-only from server service role)
-- ------------------------------------------------------------------------------
CREATE POLICY "Owner can read audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff(ARRAY['owner'])
    AND restaurant_id = public.current_staff_restaurant_id()
  );
