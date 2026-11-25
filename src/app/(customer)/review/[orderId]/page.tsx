import { Suspense } from "react";
import { QrCode, Receipt, Star } from "lucide-react";
import { getVerifiedTableSession } from "@/lib/security/table-session";
import { getCustomerMenuCatalog, getVerifiedCustomerOrder } from "@/services/customer-menu";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { uuidSchema } from "@/lib/validation/common";
import { ReviewFormClient } from "@/components/customer/ReviewFormClient";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import type { Review } from "@/types/database";

async function ReviewLoader({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await getVerifiedTableSession();
  if (!session) {
    return (
      <EmptyState
        icon={QrCode}
        title="Table session required"
        description="Please scan your table QR code to review your order."
      />
    );
  }

  const { orderId } = await params;
  const parsed = uuidSchema.safeParse(orderId);
  if (!parsed.success) {
    return <ErrorState title="Invalid order link" description="Malformed order ID." />;
  }

  const orderData = await getVerifiedCustomerOrder(parsed.data, session.tableId);
  if (!orderData) {
    return (
      <EmptyState
        icon={Receipt}
        title="Order not found"
        description="This order does not belong to your current table session."
      />
    );
  }

  if (orderData.order.status !== "served") {
    return (
      <EmptyState
        icon={Star}
        title="Review opens after service"
        description="You can submit a rating once your order has been served to your table."
      />
    );
  }

  const admin = createSupabaseAdminClient();
  const [{ data: existingReview }, catalog] = await Promise.all([
    admin
      .from("reviews")
      .select("*")
      .eq("order_id", orderData.order.id)
      .maybeSingle(),
    getCustomerMenuCatalog(),
  ]);

  return (
    <ReviewFormClient
      orderId={orderData.order.id}
      orderNumber={orderData.order.order_number}
      tableNumber={orderData.tableNumber}
      googleReviewUrl={catalog?.restaurant.google_review_url ?? null}
      existingReview={(existingReview as Review | null) ?? null}
    />
  );
}

export default function CustomerReviewPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-muted" />}>
      <ReviewLoader params={params} />
    </Suspense>
  );
}
