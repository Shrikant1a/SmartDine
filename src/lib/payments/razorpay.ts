import "server-only";
import crypto from "node:crypto";

export interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface RazorpayRefundResponse {
  id: string;
  payment_id: string;
  amount: number;
  status: string;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
  );
}

/**
 * Verifies Razorpay Checkout payment signature:
 * HMAC-SHA256(key_secret, razorpay_order_id + "|" + razorpay_payment_id)
 */
export function verifyRazorpayCheckoutSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  keySecret: string;
}): boolean {
  const payload = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
  const expected = crypto
    .createHmac("sha256", params.keySecret)
    .update(payload)
    .digest("hex");

  const a = Buffer.from(params.razorpaySignature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Verifies Razorpay Webhook X-Razorpay-Signature against raw request body.
 */
export function verifyRazorpayWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string;
  webhookSecret: string;
}): boolean {
  if (!params.signatureHeader || !params.webhookSecret) return false;
  const expected = crypto
    .createHmac("sha256", params.webhookSecret)
    .update(params.rawBody)
    .digest("hex");

  const a = Buffer.from(params.signatureHeader, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getBasicAuthHeader(keyId: string, keySecret: string): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
  keyId: string;
  keySecret: string;
}): Promise<RazorpayOrderResponse> {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(params.keyId, params.keySecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Razorpay order creation failed (${res.status}): ${text}`);
  }

  return (await res.json()) as RazorpayOrderResponse;
}

export async function createRazorpayRefund(params: {
  paymentId: string;
  amountPaise?: number;
  notes?: Record<string, string>;
  keyId: string;
  keySecret: string;
}): Promise<RazorpayRefundResponse> {
  const res = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(params.paymentId)}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: getBasicAuthHeader(params.keyId, params.keySecret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(params.amountPaise ? { amount: params.amountPaise } : {}),
        notes: params.notes ?? {},
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Razorpay refund failed (${res.status}): ${text}`);
  }

  return (await res.json()) as RazorpayRefundResponse;
}
