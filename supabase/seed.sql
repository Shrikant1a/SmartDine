-- ==============================================================================
-- SmartDine Idempotent Seed Data (Phase 0)
-- 1 demo restaurant, 5 categories, 8 sample menu items (with variants & add-ons),
-- and 5 restaurant tables (hashed QR tokens only; no raw secrets stored).
-- Safe to run multiple times without creating duplicates.
-- ==============================================================================

DO $$
DECLARE
  v_restaurant_id UUID := '11111111-1111-4111-8111-111111111111';
  v_cat_starters  UUID := '22222222-2222-4222-8222-222222222201';
  v_cat_indian    UUID := '22222222-2222-4222-8222-222222222202';
  v_cat_pizza     UUID := '22222222-2222-4222-8222-222222222203';
  v_cat_beverages UUID := '22222222-2222-4222-8222-222222222204';
  v_cat_desserts  UUID := '22222222-2222-4222-8222-222222222205';

  v_item_paneer_pizza UUID := '33333333-3333-4333-8333-333333333305';
  v_item_butter_chicken UUID := '33333333-3333-4333-8333-333333333303';
BEGIN
  -- 1. Restaurant
  INSERT INTO public.restaurants (
    id, name, slug, description, address, phone,
    default_gst_percent, service_charge_percent,
    wifi_ssid, wifi_password, google_review_url, is_open
  )
  VALUES (
    v_restaurant_id,
    'SmartDine Bistro',
    'smartdine-bistro',
    'Contemporary Indian & Continental kitchen with freshly crafted dishes.',
    '12 MG Road, Indiranagar, Bengaluru 560038',
    '+91 80 4123 5678',
    5.00,
    0.00,
    'SmartDine_Guest_WiFi',
    'DineFresh@2026',
    'https://g.page/r/smartdine-bistro/review',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    address = EXCLUDED.address;

  -- 2. Five Categories
  INSERT INTO public.categories (id, restaurant_id, name, description, sort_order, is_active)
  VALUES
    (v_cat_starters,  v_restaurant_id, 'Starters',         'Crisp appetizers and small plates', 1, true),
    (v_cat_indian,    v_restaurant_id, 'Indian Food',      'Signature curries, biryanis, and breads', 2, true),
    (v_cat_pizza,     v_restaurant_id, 'Pizza and Burger', 'Wood-fired pizzas and gourmet burgers', 3, true),
    (v_cat_beverages, v_restaurant_id, 'Beverages',        'Fresh coolers, mocktails, and chai/coffee', 4, true),
    (v_cat_desserts,  v_restaurant_id, 'Desserts',         'Artisanal Indian and classic sweets', 5, true)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

  -- 3. Eight Sample Menu Items
  INSERT INTO public.menu_items (
    id, restaurant_id, category_id, name, description,
    base_price, gst_percent, is_veg, is_recommended, is_popular, is_available, stock_qty, low_stock_threshold, prep_time_mins, sort_order
  )
  VALUES
    (
      '33333333-3333-4333-8333-333333333301',
      v_restaurant_id, v_cat_starters,
      'Crispy Paneer Tikka',
      'Char-grilled cottage cheese marinated in spiced yogurt with mint chutney.',
      249.00, 5.00, true, true, true, true, 30, 5, 15, 1
    ),
    (
      '33333333-3333-4333-8333-333333333302',
      v_restaurant_id, v_cat_starters,
      'Chicken 65',
      'Crispy curry-leaf tempered spiced chicken bites.',
      279.00, 5.00, false, false, true, true, 25, 5, 15, 2
    ),
    (
      v_item_butter_chicken,
      v_restaurant_id, v_cat_indian,
      'Butter Chicken Masala',
      'Tender tandoori chicken simmered in rich velvety tomato-butter gravy.',
      349.00, 5.00, false, true, true, true, 25, 5, 20, 1
    ),
    (
      '33333333-3333-4333-8333-333333333304',
      v_restaurant_id, v_cat_indian,
      'Dal Makhani',
      'Slow-cooked black lentils finished with cream and roasted cumin.',
      269.00, 5.00, true, true, false, true, 30, 5, 18, 2
    ),
    (
      v_item_paneer_pizza,
      v_restaurant_id, v_cat_pizza,
      'Paneer Pizza',
      'Hand-tossed crust topped with tandoori paneer, bell peppers, and mozzarella.',
      149.00, 5.00, true, true, true, true, 20, 5, 18, 1
    ),
    (
      '33333333-3333-4333-8333-333333333306',
      v_restaurant_id, v_cat_pizza,
      'Classic Smash Burger',
      'Double herb-seared patty, aged cheddar, caramelized onions, and house sauce.',
      229.00, 5.00, false, false, false, true, 20, 5, 15, 2
    ),
    (
      '33333333-3333-4333-8333-333333333307',
      v_restaurant_id, v_cat_beverages,
      'Fresh Mint Lime Soda',
      'Sparkling lime cooler muddled with garden mint leaves.',
      99.00, 5.00, true, false, true, true, 50, 10, 5, 1
    ),
    (
      '33333333-3333-4333-8333-333333333308',
      v_restaurant_id, v_cat_desserts,
      'Warm Gulab Jamun',
      'Two soft khoya dumplings poached in cardamom-saffron syrup.',
      129.00, 5.00, true, true, false, true, 35, 5, 8, 1
    )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    base_price = EXCLUDED.base_price,
    is_available = EXCLUDED.is_available;

  -- Variants for Paneer Pizza (Small 149, Medium 249, Large 349)
  INSERT INTO public.menu_item_variants (menu_item_id, name, price, is_default, is_available, sort_order)
  VALUES
    (v_item_paneer_pizza, 'Small',  149.00, true,  true, 1),
    (v_item_paneer_pizza, 'Medium', 249.00, false, true, 2),
    (v_item_paneer_pizza, 'Large',  349.00, false, true, 3)
  ON CONFLICT (menu_item_id, name) DO UPDATE SET
    price = EXCLUDED.price,
    is_default = EXCLUDED.is_default;

  -- Add-ons for Paneer Pizza & Butter Chicken
  INSERT INTO public.menu_item_addons (menu_item_id, name, price, is_available, sort_order)
  VALUES
    (v_item_paneer_pizza, 'Extra Cheese', 40.00, true, 1),
    (v_item_paneer_pizza, 'Jalapenos & Olives', 30.00, true, 2),
    (v_item_butter_chicken, 'Extra Butter Naan', 55.00, true, 1)
  ON CONFLICT (menu_item_id, name) DO UPDATE SET
    price = EXCLUDED.price;

  -- 4. Five Restaurant Tables (hashed tokens via SHA-256 of dev seed labels;
  -- use the TypeScript seed helper when QR_TOKEN_SECRET HMAC tokens are configured)
  INSERT INTO public.restaurant_tables (id, restaurant_id, table_number, label, capacity, qr_token_hash, is_active)
  VALUES
    ('44444444-4444-4444-8444-444444444401', v_restaurant_id, 'T1', 'Window Booth 1',   2, encode(digest('seed-table-1-token', 'sha256'), 'hex'), true),
    ('44444444-4444-4444-8444-444444444402', v_restaurant_id, 'T2', 'Window Booth 2',   4, encode(digest('seed-table-2-token', 'sha256'), 'hex'), true),
    ('44444444-4444-4444-8444-444444444403', v_restaurant_id, 'T3', 'Center Table 3',   4, encode(digest('seed-table-3-token', 'sha256'), 'hex'), true),
    ('44444444-4444-4444-8444-444444444404', v_restaurant_id, 'T4', 'Family Lounge 4',  6, encode(digest('seed-table-4-token', 'sha256'), 'hex'), true),
    ('44444444-4444-4444-8444-444444444405', v_restaurant_id, 'T5', 'Patio Corner 5',   4, encode(digest('seed-table-5-token', 'sha256'), 'hex'), true)
  ON CONFLICT (id) DO NOTHING;
END $$;
