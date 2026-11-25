import { NextResponse, type NextRequest } from "next/server";
import { getVerifiedTableSession } from "@/lib/security/table-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createPaymentOrderSchema } from "@/lib/validation/payment";
import {
  createRazorpayOrder,
  isRazorpayConfigured,
} from "@/lib/payments/razorpay";
import { getServerEnv } from "@/lib/env-server";

export async function POST(request: NextRequest) {
  try {
    const session = await getVerifiedTableSession();
    if (!session) {
      return NextResponse.json(
        { error: "Table session required to initiate payment." },
        { status: 401 },
      );
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        { error: "Razorpay credentials are not configured on the server." },
        { status: 503 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = createPaymentOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, order_number, total_amount, payment_mode, payment_status, status, customer_name, customer_phone")
      .eq("id", parsed.data.orderId)
      .eq("table_id", session.tableId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found for your table" }, { status: 404 });
    }

    if (order.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot pay for a cancelled order" },
        { status: 400 },
      );
    }
    if (order.payment_status === "paid") {
      return NextResponse.json(
        { error: "This order has already been paid" },
        { status: 409 },
      );
    }
    if (order.payment_mode !== "online") {
      return NextResponse.json(
        { error: "This order is configured for offline settlement" },
        { status: 400 },
      );
    }

    const env = getServerEnv();
    const keyId = env.RAZORPAY_KEY_ID!;
    const keySecret = env.RAZORPAY_KEY_SECRET!;
    const amountPaise = Math.round(Number(order.total_amount) * 100);

    // Reuse existing provider_order_id if already created to prevent duplicates
    const { data: existingPayment } = await admin
      .from("payments")
      .select("id, provider_order_id")
      .eq("order_id", order.id)
      .eq("provider", "razorpay")
      .maybeSingle();

    let razorpayOrderId = existingPayment?.provider_order_id as string | null;

    if (!razorpayOrderId) {
      const rpOrder = await createRazorpayOrder({
        amountPaise,
        receipt: order.order_number,
        notes: {
          order_id: order.id,
          table_id: session.tableId,
          table_number: session.tableNumber,
        },
        keyId,
        keySecret,
      });

      razorpayOrderId = rpOrder.id;

      if (existingPayment) {
        await admin
          .from("payments")
          .update({ provider_order_id: razorpayOrderId })
          .eq("id", existingPayment.id);
      } else {
        await admin.from("payments").insert({
          restaurant_id: session.restaurantId,
          order_id: order.id,
          provider: "razorpay",
          payment_mode: "online",
          provider_order_id: razorpayOrderId,
          amount: Number(order.total_amount),
          currency: "INR",
          status: "pending",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      razorpayOrderId,
      amountPaise,
      currency: "INR",
      keyId,
      orderNumber: order.order_number,
      prefill: {
        name: order.customer_name ?? undefined,
        contact: order.customer_phone ?? undefined,
      },
    });
  } catch (err) {
    console.error("[api/payments/create POST] Error:", err);
    return NextResponse.json(
      { error: "Unable to initialize online payment." },
      { status: 500 },
    );
  }
}
