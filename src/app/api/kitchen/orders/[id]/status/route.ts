import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { uuidSchema } from "@/lib/validation/common";
import { updateOrderStatusSchema } from "@/lib/validation/kitchen";
import { canStaffTransitionOrder } from "@/services/kitchen";
import { notifyCustomerOrderReady } from "@/services/notifications";
import type { OrderStatus } from "@/constants/roles";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiStaffPermission("orders:view");

    const { id } = await context.params;
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsedBody = updateOrderStatusSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Invalid status payload" },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: existingOrder, error: fetchError } = await admin
      .from("orders")
      .select("id, restaurant_id, status")
      .eq("id", parsedId.data)
      .eq("restaurant_id", session.staff.restaurant_id)
      .maybeSingle();

    if (fetchError || !existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const fromStatus = existingOrder.status as OrderStatus;
    const toStatus = parsedBody.data.status;

    const transition = canStaffTransitionOrder(
      session.staff.role,
      fromStatus,
      toStatus,
    );

    if (!transition.allowed) {
      return NextResponse.json(
        { error: transition.reason ?? "Status transition not permitted" },
        { status: 403 },
      );
    }

    const updateFields: Record<string, unknown> = { status: toStatus };
    const nowIso = new Date().toISOString();
    if (toStatus === "preparing") updateFields.accepted_at = nowIso;
    if (toStatus === "ready") updateFields.ready_at = nowIso;
    if (toStatus === "served") updateFields.served_at = nowIso;
    if (toStatus === "cancelled") {
      updateFields.cancelled_at = nowIso;
      if (parsedBody.data.cancelReason) {
        updateFields.cancel_reason = parsedBody.data.cancelReason;
      }
    }

    const { data: updated, error: updateError } = await admin
      .from("orders")
      .update(updateFields)
      .eq("id", existingOrder.id)
      .eq("status", fromStatus)
      .select("*")
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message ?? "Order was modified concurrently. Refreshing..." },
        { status: 409 },
      );
    }

    await admin.from("audit_logs").insert({
      restaurant_id: session.staff.restaurant_id,
      staff_id: session.staff.id,
      actor_role: session.staff.role,
      action: `order.status.${toStatus}`,
      entity_type: "order",
      entity_id: existingOrder.id,
      old_values: { status: fromStatus },
      new_values: { status: toStatus },
    });

    // Broadcast sanitized status update (no PII) to customer order tracker channel
    try {
      const channel = admin.channel(`order-track-${existingOrder.id}`);
      await channel.send({
        type: "broadcast",
        event: "status_changed",
        payload: {
          orderId: existingOrder.id,
          status: updated.status,
          accepted_at: updated.accepted_at,
          ready_at: updated.ready_at,
          served_at: updated.served_at,
          cancelled_at: updated.cancelled_at,
          cancel_reason: updated.cancel_reason,
          payment_status: updated.payment_status,
        },
      });
      await admin.removeChannel(channel);
    } catch {
      // Polling fallback on customer tracker guarantees eventual consistency
    }

    if (toStatus === "ready" && updated.whatsapp_consent && updated.customer_phone) {
      const { data: tbl } = await admin
        .from("restaurant_tables")
        .select("table_number")
        .eq("id", updated.table_id)
        .maybeSingle();

      await notifyCustomerOrderReady({
        restaurantId: session.staff.restaurant_id,
        orderId: updated.id,
        orderNumber: updated.order_number,
        tableNumber: tbl?.table_number ?? "",
        customerPhone: updated.customer_phone,
        whatsappConsent: Boolean(updated.whatsapp_consent),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, order: updated });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("[api/kitchen/orders/[id]/status PATCH] Error:", err);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 },
    );
  }
}
