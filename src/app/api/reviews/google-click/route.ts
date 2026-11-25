import { NextResponse, type NextRequest } from "next/server";
import { getVerifiedTableSession } from "@/lib/security/table-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { googleClickSchema } from "@/lib/validation/review";

export async function POST(request: NextRequest) {
  try {
    const session = await getVerifiedTableSession();
    if (!session) {
      return NextResponse.json({ error: "Table session required" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = googleClickSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("id")
      .eq("id", parsed.data.orderId)
      .eq("table_id", session.tableId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await admin
      .from("reviews")
      .update({ clicked_google_review: true })
      .eq("order_id", order.id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to record click" }, { status: 500 });
  }
}
