import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        status?: string;
      };
    };
    refund?: {
      entity?: {
        id?: string;
        payment_id?: string;
      };
    };
  };
}

/**
 * Signed Razorpay Webhook Endpoint.
 * Idempotently transitions payment and order payment_status based on verified events.
 */
export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Razorpay webhook secret not configured" },
        { status: 503 },
      );
    }

    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-razorpay-signature") ?? "";

    const valid = verifyRazorpayWebhookSignature({
      rawBody,
      signatureHeader,
      webhookSecret,
    });

    if (!valid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const eventJson = JSON.parse(rawBody) as RazorpayWebhookPayload;
    const eventName = eventJson.event ?? "";
    const paymentEntity = eventJson.payload?.payment?.entity;
    const refundEntity = eventJson.payload?.refund?.entity;

    const providerOrderId = paymentEntity?.order_id;
    const providerPaymentId = paymentEntity?.id ?? refundEntity?.payment_id;
    const eventId =
      request.headers.get("x-razorpay-event-id") ||
      (providerPaymentId ? `${eventName}:${providerPaymentId}` : null);

    if (!eventName || (!providerOrderId && !providerPaymentId)) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const admin = createSupabaseAdminClient();

    // Idempotency check by provider_event_id
    if (eventId) {
      const { data: dup } = await admin
        .from("payments")
        .select("id")
        .eq("provider_event_id", eventId)
        .maybeSingle();

      if (dup) {
        return NextResponse.json({ ok: true, deduplicated: true });
      }
    }

    const query = admin.from("payments").select("*");
    const { data: paymentRow } = providerOrderId
      ? await query.eq("provider_order_id", providerOrderId).maybeSingle()
      : await query.eq("provider_payment_id", providerPaymentId!).maybeSingle();

    if (!paymentRow) {
      return NextResponse.json({ ok: true, ignored: "No matching payment record" });
    }

    const nowIso = new Date().toISOString();

    if (eventName === "payment.captured" || eventName === "order.paid") {
      if (paymentRow.status === "paid") {
        return NextResponse.json({ ok: true, deduplicated: true });
      }

      // Verify paid amount matches expected server-computed order total (in paise)
      const expectedPaise = Math.round(Number(paymentRow.amount) * 100);
      if (
        typeof paymentEntity?.amount === "number" &&
        paymentEntity.amount !== expectedPaise
      ) {
        await admin
          .from("payments")
          .update({
            status: "failed",
            raw_payload: eventJson as unknown as Record<string, unknown>,
            provider_event_id: eventId,
          })
          .eq("id", paymentRow.id);
        return NextResponse.json(
          { error: "Paid amount mismatch" },
          { status: 400 },
        );
      }

      await Promise.all([
        admin
          .from("payments")
          .update({
            status: "paid",
            provider_payment_id: providerPaymentId ?? paymentRow.provider_payment_id,
            provider_event_id: eventId,
            verified_at: nowIso,
            raw_payload: eventJson as unknown as Record<string, unknown>,
          })
          .eq("id", paymentRow.id),
        admin
          .from("orders")
          .update({ payment_status: "paid" })
          .eq("id", paymentRow.order_id),
      ]);
    } else if (eventName === "payment.failed") {
      if (paymentRow.status !== "paid") {
        await Promise.all([
          admin
            .from("payments")
            .update({
              status: "failed",
              provider_payment_id: providerPaymentId ?? paymentRow.provider_payment_id,
              provider_event_id: eventId,
              raw_payload: eventJson as unknown as Record<string, unknown>,
            })
            .eq("id", paymentRow.id),
          admin
            .from("orders")
            .update({ payment_status: "failed" })
            .eq("id", paymentRow.order_id),
        ]);
      }
    } else if (eventName === "refund.processed") {
      await Promise.all([
        admin
          .from("payments")
          .update({
            status: "refunded",
            provider_event_id: eventId,
            raw_payload: eventJson as unknown as Record<string, unknown>,
          })
          .eq("id", paymentRow.id),
        admin
          .from("orders")
          .update({ payment_status: "refunded" })
          .eq("id", paymentRow.order_id),
      ]);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/payments/webhook POST] Error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
