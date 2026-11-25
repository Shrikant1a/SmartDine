import { Suspense } from "react";
import { QrCode, Receipt } from "lucide-react";
import { getVerifiedTableSession } from "@/lib/security/table-session";
import { getVerifiedCustomerOrder } from "@/services/customer-menu";
import { uuidSchema } from "@/lib/validation/common";
import { OrderTrackerClient } from "@/components/customer/OrderTrackerClient";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";

async function OrderConfirmationLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getVerifiedTableSession();
  if (!session) {
    return (
      <EmptyState
        icon={QrCode}
        title="Table session required"
        description="Please scan your table QR code to view orders placed from your table."
      />
    );
  }

  const { id } = await params;
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) {
    return (
      <ErrorState
        title="Invalid order link"
        description="The order identifier is invalid."
      />
    );
  }

  const data = await getVerifiedCustomerOrder(parsed.data, session.tableId);
  if (!data) {
    return (
      <EmptyState
        icon={Receipt}
        title="Order not found"
        description="This order does not belong to your current table session."
      />
    );
  }

  return (
    <OrderTrackerClient
      initialOrder={data.order}
      items={data.items}
      tableNumber={data.tableNumber}
    />
  );
}

export default function CustomerOrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-muted" />}>
      <OrderConfirmationLoader params={params} />
    </Suspense>
  );
}
