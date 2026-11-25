import { NextResponse } from "next/server";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { getAdminOrdersData } from "@/services/admin-server";
import { buildOrdersCsvReport } from "@/services/analytics";

export async function GET() {
  try {
    const session = await requireApiStaffPermission("reports:view");
    const orders = await getAdminOrdersData(session.staff.restaurant_id);
    const csv = buildOrdersCsvReport(orders);
    const dateStamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="smartdine-sales-${dateStamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to generate CSV report" }, { status: 500 });
  }
}
