import { NextResponse, type NextRequest } from "next/server";
import { getVerifiedTableSession } from "@/lib/security/table-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyPaymentSchema } from "@/lib/validation/payment";
import {
  isRazorpayConfigured,
  verifyRazorpayCheckoutSignature,
} from "@/lib/payments/razorpay";
import { getServerEnv } from "@/lib/env-server";

/**
 * Verifies the Razorpay Checkout signature returned to the browser and records
 * the provider_payment_id. Final 'paid' confirmation is exclusively performed by
 * the signed Razorpay webhook handler (/api/payments/webhook).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getVerifiedTableSession();
    if (!session) {
      return NextResponse.json({ error: "Table session required" }, { status: 401 });
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });
    }

    const body = await request.json().catch(() => null);
    const parsed = verifyPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment verification payload" }, { status: 400 });
    }

    const env = getServerEnv();
    const signatureValid = verifyRazorpayCheckoutSignature({
      razorpayOrderId: parsed.data.razorpayOrderId,
      razorpayPaymentId: parsed.data.razorpayPaymentId,
      razorpaySignature: parsed.data.razorpaySignature,
      keySecret: env.RAZORPAY_KEY_SECRET!,
    });

    if (!signatureValid) {
      return NextResponse.json(
        { error: "Payment signature verification failed." },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("id, payment_status")
      .eq("id", parsed.data.orderId)
      .eq("table_id", session.tableId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Store provider_payment_id on matching payment record without prematurely marking paid
    await admin
      .from("payments")
      .update({
        provider_payment_id: parsed.data.razorpayPaymentId,
      })
      .eq("order_id", order.id)
      .eq("provider_order_id", parsed.data.razorpayOrderId);

    return NextResponse.json({
      ok: true,
      signatureVerified: true,
      paymentStatus: order.payment_status,
      awaitingWebhookConfirmation: order.payment_status !== "paid",
    });
  } catch (err) {
    console.error("[api/payments/verify POST] Error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
