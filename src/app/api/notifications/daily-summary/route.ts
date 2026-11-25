import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentStaffSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendDailySalesSummary } from "@/services/notifications";

function matchSecret(provided: string, expected?: string): boolean {
  if (!expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Triggers the daily sales WhatsApp summary either from an authenticated Owner
 * session or a scheduled cron job presenting CRON_SECRET / OWNER_BOOTSTRAP_SECRET.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const bearer = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    const cronAuthorized =
      matchSecret(bearer, process.env.CRON_SECRET) ||
      matchSecret(bearer, process.env.OWNER_BOOTSTRAP_SECRET);

    let restaurantId: string | null = null;

    if (!cronAuthorized) {
      const staffSession = await getCurrentStaffSession();
      if (!staffSession) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      if (staffSession.staff.role !== "owner") {
        return NextResponse.json(
          { error: "Only the owner can trigger daily summaries." },
          { status: 403 },
        );
      }
      restaurantId = staffSession.staff.restaurant_id;
    } else {
      const admin = createSupabaseAdminClient();
      const { data: rest } = await admin
        .from("restaurants")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      restaurantId = rest?.id ?? null;
    }

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const result = await sendDailySalesSummary(restaurantId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/notifications/daily-summary POST] Error:", err);
    return NextResponse.json(
      { error: "Failed to trigger daily summary" },
      { status: 500 },
    );
  }
}
