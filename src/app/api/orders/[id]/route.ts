import { NextResponse } from "next/server";
import { getVerifiedTableSession } from "@/lib/security/table-session";
import { uuidSchema } from "@/lib/validation/common";
import { getVerifiedCustomerOrder } from "@/services/customer-menu";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getVerifiedTableSession();
    if (!session) {
      return NextResponse.json({ error: "Table session required" }, { status: 401 });
    }

    const { id } = await context.params;
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const result = await getVerifiedCustomerOrder(parsedId.data, session.tableId);
    if (!result) {
      return NextResponse.json({ error: "Order not found for this table" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/orders/[id] GET] Error:", err);
    return NextResponse.json({ error: "Unable to load order" }, { status: 500 });
  }
}
