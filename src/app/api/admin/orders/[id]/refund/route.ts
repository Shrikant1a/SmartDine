import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { uuidSchema } from "@/lib/validation/common";
import { refundOrderSchema } from "@/lib/validation/payment";
import { createRazorpayRefund, isRazorpayConfigured } from "@/lib/payments/razorpay";
import { getServerEnv } from "@/lib/env-server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiStaffPermission("payments:refund");
    const { id } = await context.params;
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parsedBody = refundOrderSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid refund payload" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: payment } = await admin
      .from("payments")
      .select("*")
      .eq("order_id", parsedId.data)
      .eq("restaurant_id", session.staff.restaurant_id)
      .maybeSingle();

    if (!payment || payment.status !== "paid") {
      return NextResponse.json(
        { error: "Only paid orders can be refunded." },
        { status: 400 },
      );
    }

    if (payment.provider === "razorpay") {
      if (!isRazorpayConfigured() || !payment.provider_payment_id) {
        return NextResponse.json(
          { error: "Missing Razorpay configuration or payment reference for refund." },
          { status: 400 },
        );
      }

      const env = getServerEnv();
      await createRazorpayRefund({
        paymentId: payment.provider_payment_id,
        notes: {
          order_id: parsedId.data,
          reason: parsedBody.data.reason || "Owner issued refund",
        },
        keyId: env.RAZORPAY_KEY_ID!,
        keySecret: env.RAZORPAY_KEY_SECRET!,
      });
    }

    await Promise.all([
      admin.from("payments").update({ status: "refunded" }).eq("id", payment.id),
      admin
        .from("orders")
        .update({ payment_status: "refunded" })
        .eq("id", parsedId.data),
      admin.from("audit_logs").insert({
        restaurant_id: session.staff.restaurant_id,
        staff_id: session.staff.id,
        actor_role: session.staff.role,
        action: "payment.refund",
        entity_type: "order",
        entity_id: parsedId.data,
        old_values: { payment_status: "paid" },
        new_values: {
          payment_status: "refunded",
          reason: parsedBody.data.reason ?? null,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("[api/admin/orders/[id]/refund POST] Error:", err);
    return NextResponse.json({ error: "Refund failed" }, { status: 500 });
  }
}
