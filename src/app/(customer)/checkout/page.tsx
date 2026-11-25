import { Suspense } from "react";
import { QrCode } from "lucide-react";
import { getVerifiedTableSession } from "@/lib/security/table-session";
import { CheckoutClientView } from "@/components/customer/CheckoutClientView";
import { EmptyState } from "@/components/shared/EmptyState";

async function CheckoutLoader() {
  const session = await getVerifiedTableSession();
  if (!session) {
    return (
      <EmptyState
        icon={QrCode}
        title="Table verification required"
        description="Please scan the QR code on your dining table before placing an order."
      />
    );
  }

  const razorpayEnabled = Boolean(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
  );

  return (
    <CheckoutClientView
      tableNumber={session.tableNumber}
      razorpayEnabled={razorpayEnabled}
    />
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-muted" />}>
      <CheckoutLoader />
    </Suspense>
  );
}
