import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from "@/lib/payments/razorpay";

describe("Razorpay signature & webhook verification", () => {
  it("verifies valid Razorpay Checkout HMAC-SHA256 signatures and rejects tampering", () => {
    const secret = "rzp_test_secret_1234567890";
    const rpOrderId = "order_P9xAbc12345";
    const rpPaymentId = "pay_P9xDef67890";
    const validSig = crypto
      .createHmac("sha256", secret)
      .update(`${rpOrderId}|${rpPaymentId}`)
      .digest("hex");

    expect(
      verifyRazorpayCheckoutSignature({
        razorpayOrderId: rpOrderId,
        razorpayPaymentId: rpPaymentId,
        razorpaySignature: validSig,
        keySecret: secret,
      }),
    ).toBe(true);

    expect(
      verifyRazorpayCheckoutSignature({
        razorpayOrderId: rpOrderId,
        razorpayPaymentId: "pay_tampered",
        razorpaySignature: validSig,
        keySecret: secret,
      }),
    ).toBe(false);
  });

  it("verifies Razorpay Webhook X-Razorpay-Signature against raw payload", () => {
    const webhookSecret = "whsec_test_secret_123456";
    const rawBody = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_1", order_id: "order_1", amount: 24900 } } },
    });
    const validHeader = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    expect(
      verifyRazorpayWebhookSignature({
        rawBody,
        signatureHeader: validHeader,
        webhookSecret,
      }),
    ).toBe(true);

    expect(
      verifyRazorpayWebhookSignature({
        rawBody: rawBody.replace("24900", "100"),
        signatureHeader: validHeader,
        webhookSecret,
      }),
    ).toBe(false);
  });
});
