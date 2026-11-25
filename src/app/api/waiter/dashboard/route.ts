import { NextResponse } from "next/server";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { fetchWaiterDashboardSnapshot } from "@/services/waiter-server";

export async function GET() {
  try {
    const session = await requireApiStaffPermission("waiter_calls:view");
    const snapshot = await fetchWaiterDashboardSnapshot(
      session.staff.restaurant_id,
      session.staff.id,
      session.staff.role,
    );
    return NextResponse.json(snapshot);
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to load waiter dashboard" }, { status: 500 });
  }
}
