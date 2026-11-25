-- ==============================================================================
-- SmartDine Migration 0004: Atomic Server-Side Order Creation RPC
-- Computes all prices, variants, add-ons, GST, service charge, and stock updates
-- inside a single serialized/row-locked transaction.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_restaurant_id UUID,
  p_table_id UUID,
  p_payment_mode TEXT,
  p_customer_name TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_special_instructions TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_order public.orders;
  v_restaurant public.restaurants;
  v_table public.restaurant_tables;
  v_order public.orders;
  v_order_number TEXT;
  v_item JSONB;
  v_menu_item public.menu_items;
  v_variant public.menu_item_variants;
  v_addon public.menu_item_addons;
  v_qty INT;
  v_unit_price NUMERIC(10,2);
  v_variant_name TEXT;
  v_addons_total NUMERIC(10,2);
  v_addons_snapshot JSONB;
  v_addon_id UUID;
  v_line_subtotal NUMERIC(10,2);
  v_line_tax NUMERIC(10,2);
  v_subtotal NUMERIC(10,2) := 0.00;
  v_tax_amount NUMERIC(10,2) := 0.00;
  v_service_charge NUMERIC(10,2) := 0.00;
  v_total_amount NUMERIC(10,2) := 0.00;
  v_item_note TEXT;
  v_variant_id UUID;
  v_prepared_items JSONB := '[]'::jsonb;
  v_prep JSONB;
BEGIN
  -- 1. Validate payment mode
  IF p_payment_mode NOT IN ('online', 'cash_table', 'counter') THEN
    RAISE EXCEPTION 'Invalid payment mode: %', p_payment_mode;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- 2. Idempotency check (prevents duplicate orders on double-submit/retry)
  IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
    SELECT * INTO v_existing_order
    FROM public.orders
    WHERE table_id = p_table_id
      AND idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN v_existing_order;
    END IF;
  END IF;

  -- 3. Validate active restaurant and active table
  SELECT * INTO v_restaurant
  FROM public.restaurants
  WHERE id = p_restaurant_id
  LIMIT 1;

  IF NOT FOUND OR NOT v_restaurant.is_open THEN
    RAISE EXCEPTION 'Restaurant is currently closed for new orders';
  END IF;

  SELECT * INTO v_table
  FROM public.restaurant_tables
  WHERE id = p_table_id
    AND restaurant_id = p_restaurant_id
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Table is inactive or does not exist';
  END IF;

  -- 4. Lock menu items in deterministic order to avoid deadlocks and verify stock/prices
  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(p_items) AS t(value)
    ORDER BY (value->>'menuItemId')::uuid ASC
  LOOP
    v_qty := (v_item->>'quantity')::INT;
    IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 50 THEN
      RAISE EXCEPTION 'Item quantity must be between 1 and 50';
    END IF;

    SELECT * INTO v_menu_item
    FROM public.menu_items
    WHERE id = (v_item->>'menuItemId')::UUID
      AND restaurant_id = p_restaurant_id
    FOR UPDATE;

    IF NOT FOUND OR v_menu_item.is_archived THEN
      RAISE EXCEPTION 'One or more menu items no longer exist';
    END IF;

    IF NOT v_menu_item.is_available THEN
      RAISE EXCEPTION 'Item "%" is currently sold out', v_menu_item.name;
    END IF;

    -- Atomic stock check and deduction
    IF v_menu_item.stock_qty IS NOT NULL THEN
      IF v_menu_item.stock_qty < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for "%" (% remaining)', v_menu_item.name, v_menu_item.stock_qty;
      END IF;

      UPDATE public.menu_items
      SET
        stock_qty = stock_qty - v_qty,
        is_available = CASE WHEN (stock_qty - v_qty) <= 0 THEN false ELSE is_available END
      WHERE id = v_menu_item.id;
    END IF;

    -- Resolve variant price (or item base price)
    v_unit_price := v_menu_item.base_price;
    v_variant_name := NULL;

    IF NULLIF(v_item->>'variantId', '') IS NOT NULL THEN
      v_variant_id := (v_item->>'variantId')::UUID;
      SELECT * INTO v_variant
      FROM public.menu_item_variants
      WHERE id = v_variant_id
        AND menu_item_id = v_menu_item.id
      LIMIT 1;

      IF NOT FOUND OR NOT v_variant.is_available THEN
        RAISE EXCEPTION 'Selected variant for "%" is unavailable', v_menu_item.name;
      END IF;

      v_unit_price := v_variant.price;
      v_variant_name := v_variant.name;
    END IF;

    -- Resolve add-ons
    v_addons_total := 0.00;
    v_addons_snapshot := '[]'::jsonb;

    IF v_item ? 'addonIds' AND jsonb_typeof(v_item->'addonIds') = 'array' THEN
      FOR v_addon_id IN
        SELECT DISTINCT (elem)::UUID
        FROM jsonb_array_elements_text(v_item->'addonIds') AS elem
      LOOP
        SELECT * INTO v_addon
        FROM public.menu_item_addons
        WHERE id = v_addon_id
          AND menu_item_id = v_menu_item.id
        LIMIT 1;

        IF NOT FOUND OR NOT v_addon.is_available THEN
          RAISE EXCEPTION 'Selected add-on for "%" is unavailable', v_menu_item.name;
        END IF;

        v_addons_total := v_addons_total + v_addon.price;
        v_addons_snapshot := v_addons_snapshot || jsonb_build_object(
          'id', v_addon.id,
          'name', v_addon.name,
          'price', v_addon.price
        );
      END LOOP;
    END IF;

    v_line_subtotal := round((v_unit_price + v_addons_total) * v_qty, 2);
    v_line_tax := round(v_line_subtotal * v_menu_item.gst_percent / 100.0, 2);

    v_subtotal := v_subtotal + v_line_subtotal;
    v_tax_amount := v_tax_amount + v_line_tax;
    v_item_note := NULLIF(trim(COALESCE(v_item->>'specialInstructions', '')), '');

    v_prepared_items := v_prepared_items || jsonb_build_object(
      'menu_item_id', v_menu_item.id,
      'item_name_snapshot', v_menu_item.name,
      'variant_name_snapshot', v_variant_name,
      'addons_snapshot', v_addons_snapshot,
      'unit_price_snapshot', v_unit_price,
      'addons_total_snapshot', v_addons_total,
      'gst_percent_snapshot', v_menu_item.gst_percent,
      'quantity', v_qty,
      'line_total', v_line_subtotal,
      'special_instructions', v_item_note
    );
  END LOOP;

  -- 5. Final order totals
  v_service_charge := round(v_subtotal * v_restaurant.service_charge_percent / 100.0, 2);
  v_total_amount := round(v_subtotal + v_tax_amount + v_service_charge, 2);
  v_order_number := public.generate_order_number();

  INSERT INTO public.orders (
    restaurant_id,
    table_id,
    order_number,
    idempotency_key,
    status,
    payment_mode,
    payment_status,
    subtotal,
    tax_amount,
    service_charge,
    total_amount,
    customer_name,
    customer_phone,
    special_instructions
  )
  VALUES (
    p_restaurant_id,
    p_table_id,
    v_order_number,
    NULLIF(trim(COALESCE(p_idempotency_key, '')), ''),
    'new',
    p_payment_mode,
    'pending',
    v_subtotal,
    v_tax_amount,
    v_service_charge,
    v_total_amount,
    NULLIF(trim(COALESCE(p_customer_name, '')), ''),
    NULLIF(trim(COALESCE(p_customer_phone, '')), ''),
    NULLIF(trim(COALESCE(p_special_instructions, '')), '')
  )
  RETURNING * INTO v_order;

  -- 6. Insert immutable order_items snapshots
  FOR v_prep IN SELECT value FROM jsonb_array_elements(v_prepared_items) AS t(value)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      menu_item_id,
      item_name_snapshot,
      variant_name_snapshot,
      addons_snapshot,
      unit_price_snapshot,
      addons_total_snapshot,
      gst_percent_snapshot,
      quantity,
      line_total,
      special_instructions
    )
    VALUES (
      v_order.id,
      (v_prep->>'menu_item_id')::UUID,
      v_prep->>'item_name_snapshot',
      NULLIF(v_prep->>'variant_name_snapshot', ''),
      v_prep->'addons_snapshot',
      (v_prep->>'unit_price_snapshot')::NUMERIC(10,2),
      (v_prep->>'addons_total_snapshot')::NUMERIC(10,2),
      (v_prep->>'gst_percent_snapshot')::NUMERIC(5,2),
      (v_prep->>'quantity')::INT,
      (v_prep->>'line_total')::NUMERIC(10,2),
      NULLIF(v_prep->>'special_instructions', '')
    );
  END LOOP;

  -- 7. Record initial payment intent row
  INSERT INTO public.payments (
    restaurant_id,
    order_id,
    provider,
    payment_mode,
    amount,
    currency,
    status
  )
  VALUES (
    p_restaurant_id,
    v_order.id,
    CASE
      WHEN p_payment_mode = 'cash_table' THEN 'cash'
      WHEN p_payment_mode = 'counter' THEN 'counter'
      ELSE 'razorpay'
    END,
    p_payment_mode,
    v_total_amount,
    'INR',
    'pending'
  );

  -- 8. Mark table as occupied
  UPDATE public.restaurant_tables
  SET status = 'occupied'
  WHERE id = p_table_id AND status = 'available';

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_atomic(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
