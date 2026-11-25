import { Suspense } from "react";
import { QrCode } from "lucide-react";
import { qrTokenParamSchema } from "@/lib/validation/common";
import {
  getCustomerMenuCatalog,
  resolveTableByRawToken,
} from "@/services/customer-menu";
import { CustomerMenuView } from "@/components/customer/CustomerMenuView";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";

async function TableMenuLoader({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const parsed = qrTokenParamSchema.safeParse(token);

  if (!parsed.success) {
    return (
      <ErrorState
        title="Invalid table QR code"
        description="This QR link appears malformed. Please scan the QR code placed on your table again or ask a staff member."
      />
    );
  }

  let table = null;
  let catalog = null;
  try {
    table = await resolveTableByRawToken(parsed.data);
    if (table) {
      catalog = await getCustomerMenuCatalog();
    }
  } catch {
    return (
      <ErrorState
        title="Menu temporarily unavailable"
        description="We could not connect to the restaurant menu right now. Please try again in a moment."
      />
    );
  }

  if (!table) {
    return (
      <EmptyState
        icon={QrCode}
        title="Table QR code not active"
        description="This table QR code is invalid, disabled, or has been regenerated. Please scan the latest QR stand on your table."
      />
    );
  }

  if (!catalog) {
    return (
      <EmptyState
        icon={QrCode}
        title="Menu not configured yet"
        description="The restaurant menu has not been published yet. Please notify your waiter."
      />
    );
  }

  return <CustomerMenuView qrToken={parsed.data} table={table} catalog={catalog} />;
}

export default function CustomerMenuByTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
      <TableMenuLoader params={params} />
    </Suspense>
  );
}
