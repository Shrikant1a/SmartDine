import { Suspense } from "react";
import { redirect } from "next/navigation";
import { QrCode } from "lucide-react";
import { getVerifiedTableSession } from "@/lib/security/table-session";
import { getCustomerMenuCatalog } from "@/services/customer-menu";
import { CustomerMenuView } from "@/components/customer/CustomerMenuView";
import { EmptyState } from "@/components/shared/EmptyState";

async function MenuTokenOrSession({
  searchParams,
}: {
  searchParams: Promise<{ table_token?: string }>;
}) {
  const params = await searchParams;
  if (params.table_token) {
    redirect(`/menu/${encodeURIComponent(params.table_token)}`);
  }

  const session = await getVerifiedTableSession();
  if (!session) {
    return (
      <EmptyState
        icon={QrCode}
        title="Scan your table QR code"
        description="To browse the digital menu and place an order, please scan the QR stand placed on your dining table."
      />
    );
  }

  const catalog = await getCustomerMenuCatalog();
  if (!catalog) {
    return (
      <EmptyState
        icon={QrCode}
        title="Menu not configured yet"
        description="Please ask a staff member for assistance."
      />
    );
  }

  return (
    <CustomerMenuView
      qrToken=""
      table={{
        id: session.tableId,
        restaurant_id: session.restaurantId,
        table_number: session.tableNumber,
        label: null,
        token_version: session.tokenVersion,
      }}
      catalog={catalog}
    />
  );
}

export default function CustomerMenuIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ table_token?: string }>;
}) {
  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-muted" />}>
      <MenuTokenOrSession searchParams={searchParams} />
    </Suspense>
  );
}
