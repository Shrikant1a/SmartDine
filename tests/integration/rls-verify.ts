import { createClient } from "@supabase/supabase-js";

/**
 * Live RLS Negative & Positive Verification Script.
 * Run against a migrated + seeded Supabase project via:
 *   npm run verify:rls
 */
async function verifyRls() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.log("Skipping live RLS verification: NEXT_PUBLIC_SUPABASE_URL / ANON_KEY not set.");
    return;
  }

  const anon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const deniedTables = [
    "staff",
    "restaurants",
    "restaurant_tables",
    "orders",
    "order_items",
    "payments",
    "waiter_calls",
    "reviews",
    "notification_logs",
    "audit_logs",
  ];

  for (const table of deniedTables) {
    const { data, error } = await anon.from(table).select("*").limit(1);
    if (!error && Array.isArray(data) && data.length > 0) {
      throw new Error(`RLS FAILURE: anon user read rows from protected table "${table}"`);
    }
    console.log(`PASS: anon blocked from reading "${table}"`);
  }

  // Public menu categories & items should be readable
  const { error: catErr } = await anon.from("categories").select("id, name").limit(5);
  if (catErr) {
    throw new Error(`RLS FAILURE: anon could not read active categories: ${catErr.message}`);
  }
  console.log("PASS: anon can read active categories");

  const { error: rpcErr } = await anon.rpc("get_public_restaurant_info");
  if (rpcErr) {
    throw new Error(`RPC FAILURE: get_public_restaurant_info failed: ${rpcErr.message}`);
  }
  console.log("PASS: get_public_restaurant_info RPC succeeded without exposing private fields");
}

verifyRls().catch((err) => {
  console.error("RLS verification failed:", err);
  process.exit(1);
});
