import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

/**
 * Repeatable TypeScript seed script for local/staging Supabase instances.
 * Ensures 1 restaurant, 5 categories, 8 menu items (with variants & add-ons),
 * and 5 tables with HMAC-SHA256 hashed QR tokens matching QR_TOKEN_SECRET.
 *
 * Run via: npx tsx src/services/seed.ts
 */

const RESTAURANT_ID = "11111111-1111-4111-8111-111111111111";

const CATEGORIES = [
  { id: "22222222-2222-4222-8222-222222222201", name: "Starters", description: "Crisp appetizers and small plates", sort_order: 1 },
  { id: "22222222-2222-4222-8222-222222222202", name: "Indian Food", description: "Signature curries, biryanis, and breads", sort_order: 2 },
  { id: "22222222-2222-4222-8222-222222222203", name: "Pizza and Burger", description: "Wood-fired pizzas and gourmet burgers", sort_order: 3 },
  { id: "22222222-2222-4222-8222-222222222204", name: "Beverages", description: "Fresh coolers, mocktails, and chai/coffee", sort_order: 4 },
  { id: "22222222-2222-4222-8222-222222222205", name: "Desserts", description: "Artisanal Indian and classic sweets", sort_order: 5 },
];

const TABLES = [
  { id: "44444444-4444-4444-8444-444444444401", table_number: "T1", label: "Window Booth 1", capacity: 2 },
  { id: "44444444-4444-4444-8444-444444444402", table_number: "T2", label: "Window Booth 2", capacity: 4 },
  { id: "44444444-4444-4444-8444-444444444403", table_number: "T3", label: "Center Table 3", capacity: 4 },
  { id: "44444444-4444-4444-8444-444444444404", table_number: "T4", label: "Family Lounge 4", capacity: 6 },
  { id: "44444444-4444-4444-8444-444444444405", table_number: "T5", label: "Patio Corner 5", capacity: 4 },
];

function hashQrToken(rawToken: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(rawToken).digest("hex");
}

function deterministicDevToken(tableNumber: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`smartdine-dev-qr:${tableNumber}`)
    .digest("base64url")
    .slice(0, 32);
}

async function runSeed() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const qrSecret = process.env.QR_TOKEN_SECRET;

  if (!url || !serviceKey || !qrSecret) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or QR_TOKEN_SECRET in environment.",
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Restaurant
  const { error: restError } = await supabase.from("restaurants").upsert(
    {
      id: RESTAURANT_ID,
      name: "SmartDine Bistro",
      slug: "smartdine-bistro",
      description: "Contemporary Indian & Continental kitchen with freshly crafted dishes.",
      address: "12 MG Road, Indiranagar, Bengaluru 560038",
      phone: "+91 80 4123 5678",
      default_gst_percent: 5.0,
      service_charge_percent: 0.0,
      wifi_ssid: "SmartDine_Guest_WiFi",
      wifi_password: "DineFresh@2026",
      google_review_url: "https://g.page/r/smartdine-bistro/review",
      is_open: true,
    },
    { onConflict: "id" },
  );
  if (restError) throw restError;

  // 2. Categories
  const { error: catError } = await supabase.from("categories").upsert(
    CATEGORIES.map((c) => ({ ...c, restaurant_id: RESTAURANT_ID, is_active: true })),
    { onConflict: "id" },
  );
  if (catError) throw catError;

  // 3. Menu items (8 items)
  const items = [
    {
      id: "33333333-3333-4333-8333-333333333301",
      category_id: CATEGORIES[0].id,
      name: "Crispy Paneer Tikka",
      description: "Char-grilled cottage cheese marinated in spiced yogurt with mint chutney.",
      base_price: 249,
      is_veg: true,
      is_recommended: true,
      is_popular: true,
      stock_qty: 30,
      sort_order: 1,
    },
    {
      id: "33333333-3333-4333-8333-333333333302",
      category_id: CATEGORIES[0].id,
      name: "Chicken 65",
      description: "Crispy curry-leaf tempered spiced chicken bites.",
      base_price: 279,
      is_veg: false,
      is_recommended: false,
      is_popular: true,
      stock_qty: 25,
      sort_order: 2,
    },
    {
      id: "33333333-3333-4333-8333-333333333303",
      category_id: CATEGORIES[1].id,
      name: "Butter Chicken Masala",
      description: "Tender tandoori chicken simmered in rich velvety tomato-butter gravy.",
      base_price: 349,
      is_veg: false,
      is_recommended: true,
      is_popular: true,
      stock_qty: 25,
      sort_order: 1,
    },
    {
      id: "33333333-3333-4333-8333-333333333304",
      category_id: CATEGORIES[1].id,
      name: "Dal Makhani",
      description: "Slow-cooked black lentils finished with cream and roasted cumin.",
      base_price: 269,
      is_veg: true,
      is_recommended: true,
      is_popular: false,
      stock_qty: 30,
      sort_order: 2,
    },
    {
      id: "33333333-3333-4333-8333-333333333305",
      category_id: CATEGORIES[2].id,
      name: "Paneer Pizza",
      description: "Hand-tossed crust topped with tandoori paneer, bell peppers, and mozzarella.",
      base_price: 149,
      is_veg: true,
      is_recommended: true,
      is_popular: true,
      stock_qty: 20,
      sort_order: 1,
    },
    {
      id: "33333333-3333-4333-8333-333333333306",
      category_id: CATEGORIES[2].id,
      name: "Classic Smash Burger",
      description: "Double herb-seared patty, aged cheddar, caramelized onions, and house sauce.",
      base_price: 229,
      is_veg: false,
      is_recommended: false,
      is_popular: false,
      stock_qty: 20,
      sort_order: 2,
    },
    {
      id: "33333333-3333-4333-8333-333333333307",
      category_id: CATEGORIES[3].id,
      name: "Fresh Mint Lime Soda",
      description: "Sparkling lime cooler muddled with garden mint leaves.",
      base_price: 99,
      is_veg: true,
      is_recommended: false,
      is_popular: true,
      stock_qty: 50,
      sort_order: 1,
    },
    {
      id: "33333333-3333-4333-8333-333333333308",
      category_id: CATEGORIES[4].id,
      name: "Warm Gulab Jamun",
      description: "Two soft khoya dumplings poached in cardamom-saffron syrup.",
      base_price: 129,
      is_veg: true,
      is_recommended: true,
      is_popular: false,
      stock_qty: 35,
      sort_order: 1,
    },
  ];

  const { error: itemError } = await supabase.from("menu_items").upsert(
    items.map((item) => ({
      ...item,
      restaurant_id: RESTAURANT_ID,
      gst_percent: 5.0,
      is_available: true,
      is_archived: false,
    })),
    { onConflict: "id" },
  );
  if (itemError) throw itemError;

  // Variants for Paneer Pizza
  const { error: variantError } = await supabase.from("menu_item_variants").upsert(
    [
      { menu_item_id: "33333333-3333-4333-8333-333333333305", name: "Small", price: 149, is_default: true, sort_order: 1 },
      { menu_item_id: "33333333-3333-4333-8333-333333333305", name: "Medium", price: 249, is_default: false, sort_order: 2 },
      { menu_item_id: "33333333-3333-4333-8333-333333333305", name: "Large", price: 349, is_default: false, sort_order: 3 },
    ],
    { onConflict: "menu_item_id,name" },
  );
  if (variantError) throw variantError;

  // Add-ons
  const { error: addonError } = await supabase.from("menu_item_addons").upsert(
    [
      { menu_item_id: "33333333-3333-4333-8333-333333333305", name: "Extra Cheese", price: 40, sort_order: 1 },
      { menu_item_id: "33333333-3333-4333-8333-333333333305", name: "Jalapenos & Olives", price: 30, sort_order: 2 },
      { menu_item_id: "33333333-3333-4333-8333-333333333303", name: "Extra Butter Naan", price: 55, sort_order: 1 },
    ],
    { onConflict: "menu_item_id,name" },
  );
  if (addonError) throw addonError;

  // 4. Five Tables with HMAC-hashed QR tokens
  const tableRows = TABLES.map((t) => {
    const rawToken = deterministicDevToken(t.table_number, qrSecret);
    return {
      ...t,
      restaurant_id: RESTAURANT_ID,
      qr_token_hash: hashQrToken(rawToken, qrSecret),
      is_active: true,
      rawDevToken: rawToken,
    };
  });

  const { error: tableError } = await supabase.from("restaurant_tables").upsert(
    tableRows.map(
      ({ id, restaurant_id, table_number, label, capacity, qr_token_hash, is_active }) => ({
        id,
        restaurant_id,
        table_number,
        label,
        capacity,
        qr_token_hash,
        is_active,
      }),
    ),
    { onConflict: "id" },
  );
  if (tableError) throw tableError;

  console.log("SmartDine seed completed successfully:");
  console.log("- 1 restaurant (SmartDine Bistro)");
  console.log(`- ${CATEGORIES.length} categories`);
  console.log(`- ${items.length} menu items`);
  console.log(`- ${tableRows.length} tables`);
  if (process.env.NODE_ENV !== "production") {
    console.log("\nDevelopment QR URLs (non-production only):");
    for (const t of tableRows) {
      console.log(`  ${t.table_number}: /menu/${t.rawDevToken}`);
    }
  }
}

runSeed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
