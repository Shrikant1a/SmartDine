import { NextResponse } from "next/server";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { fetchKitchenSnapshot } from "@/services/kitchen-server";

export async function GET() {
  try {
    const session = await requireApiStaffPermission("orders:view");
    const snapshot = await fetchKitchenSnapshot(session.staff.restaurant_id);
    return NextResponse.json(snapshot);
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("[api/kitchen/orders GET] Error:", err);
    return NextResponse.json({ error: "Failed to load kitchen orders" }, { status: 500 });
  }
}
