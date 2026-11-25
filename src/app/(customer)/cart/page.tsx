import { Suspense } from "react";
import { QrCode } from "lucide-react";
import { getVerifiedTableSession } from "@/lib/security/table-session";
import { getCustomerMenuCatalog } from "@/services/customer-menu";
import { CartClientView } from "@/components/customer/CartClientView";
import { EmptyState } from "@/components/shared/EmptyState";

async function CartLoader() {
  const session = await getVerifiedTableSession();
  if (!session) {
    return (
      <EmptyState
        icon={QrCode}
        title="No active table session"
        description="Please scan the QR code on your restaurant table to browse the menu and manage your cart."
      />
    );
  }

  const catalog = await getCustomerMenuCatalog();
  return (
    <CartClientView
      tableNumber={session.tableNumber}
      menuItems={catalog?.items ?? []}
    />
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-muted" />}>
      <CartLoader />
    </Suspense>
  );
}
