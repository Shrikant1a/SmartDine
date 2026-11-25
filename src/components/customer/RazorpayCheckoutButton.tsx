"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function launchRazorpayForOrder(params: {
  orderId: string;
  onVerified: () => void;
  onDismissOrFail?: (msg?: string) => void;
}) {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    params.onDismissOrFail?.("Could not load Razorpay Checkout script.");
    return;
  }

  const createRes = await fetch("/api/payments/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: params.orderId }),
  });
  const createData = await createRes.json();
  if (!createRes.ok) {
    params.onDismissOrFail?.(createData.error || "Unable to initialize Razorpay payment.");
    return;
  }

  const rzp = new window.Razorpay({
    key: createData.keyId,
    amount: createData.amountPaise,
    currency: createData.currency,
    name: "SmartDine",
    description: `Order ${createData.orderNumber}`,
    order_id: createData.razorpayOrderId,
    prefill: createData.prefill,
    handler: async (response: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      try {
        const verifyRes = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: params.orderId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          params.onDismissOrFail?.(
            verifyData.error || "Signature verification failed.",
          );
          return;
        }
        toast.success(
          "Payment authorized! Confirming via Razorpay webhook...",
        );
        params.onVerified();
      } catch {
        params.onDismissOrFail?.("Network error verifying payment.");
      }
    },
    modal: {
      ondismiss: () => {
        params.onDismissOrFail?.("Payment window closed before completion.");
      },
    },
    theme: {
      color: "#d97706",
    },
  });

  rzp.open();
}

export function RazorpayRetryButton({
  orderId,
  onCompleted,
}: {
  orderId: string;
  onCompleted: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handlePay() {
    setBusy(true);
    try {
      await launchRazorpayForOrder({
        orderId,
        onVerified: () => {
          setBusy(false);
          onCompleted();
        },
        onDismissOrFail: (msg) => {
          setBusy(false);
          if (msg) toast.info(msg);
        },
      });
    } catch {
      setBusy(false);
      toast.error("Could not open payment window.");
    }
  }

  return (
    <Button
      type="button"
      disabled={busy}
      onClick={() => void handlePay()}
      className="bg-amber-600 text-white hover:bg-amber-700"
    >
      {busy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" />
      )}
      Pay Online Now
    </Button>
  );
}
