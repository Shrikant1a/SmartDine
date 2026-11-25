import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { uuidSchema } from "@/lib/validation/common";
import { markPaymentPaidSchema } from "@/lib/validation/admin";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiStaffPermission("payments:collect_cash");
    const { id } = await context.params;
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = markPaymentPaidSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }

    if (
      parsed.data.paymentStatus === "refunded" &&
      session.staff.role !== "owner"
    ) {
      return NextResponse.json(
        { error: "Only the owner can mark payments as refunded." },
        { status: 403 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: order, error: fetchErr } = await admin
      .from("orders")
      .select("id, payment_mode, payment_status")
      .eq("id", parsedId.data)
      .eq("restaurant_id", session.staff.restaurant_id)
      .maybeSingle();

    if (fetchErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.payment_mode === "online" && parsed.data.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "Online payments can only be marked paid via verified Razorpay webhook." },
        { status: 400 },
      );
    }

    const nowIso = new Date().toISOString();
    const [{ error: orderUpdErr }, { error: payUpdErr }] = await Promise.all([
      admin
        .from("orders")
        .update({ payment_status: parsed.data.paymentStatus })
        .eq("id", order.id),
      admin
        .from("payments")
        .update({
          status: parsed.data.paymentStatus,
          verified_at: parsed.data.paymentStatus === "paid" ? nowIso : undefined,
        })
        .eq("order_id", order.id),
    ]);

    if (orderUpdErr || payUpdErr) {
      return NextResponse.json({ error: "Failed to update payment status" }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      restaurant_id: session.staff.restaurant_id,
      staff_id: session.staff.id,
      actor_role: session.staff.role,
      action: `payment.${parsed.data.paymentStatus}`,
      entity_type: "order",
      entity_id: order.id,
      old_values: { payment_status: order.payment_status },
      new_values: { payment_status: parsed.data.paymentStatus },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to update payment status" }, { status: 500 });
  }
}
