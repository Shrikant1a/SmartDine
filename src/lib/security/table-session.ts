import "server-only";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  TABLE_SESSION_COOKIE_NAME,
  verifyTableSession,
  type TableSessionPayload,
} from "@/lib/security/qr";

/**
 * Reads and cryptographically verifies the customer's signed table session cookie,
 * then confirms the table is still active and its token_version has not been rotated.
 */
export async function getVerifiedTableSession(): Promise<TableSessionPayload | null> {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(TABLE_SESSION_COOKIE_NAME)?.value;
  if (!rawCookie) return null;

  const env = getServerEnv();
  const session = verifyTableSession(rawCookie, env.TABLE_SESSION_SECRET);
  if (!session) return null;

  const admin = createSupabaseAdminClient();
  const { data: table, error } = await admin
    .from("restaurant_tables")
    .select("id, restaurant_id, table_number, token_version, is_active")
    .eq("id", session.tableId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !table) return null;
  if (table.token_version !== session.tokenVersion) return null;

  return {
    ...session,
    tableNumber: table.table_number,
    restaurantId: table.restaurant_id,
  };
}
