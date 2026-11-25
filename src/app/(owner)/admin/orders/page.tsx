import { Suspense } from "react";
import { requireStaffRole } from "@/lib/auth/session";
import { getAdminOrdersData } from "@/services/admin-server";
import { OrdersManager } from "@/components/dashboard/OrdersManager";
import { PageShellSkeleton } from "@/components/shared/PageShellSkeleton";

async function OrdersContent() {
  const session = await requireStaffRole(["owner", "manager"]);
  const orders = await getAdminOrdersData(session.staff.restaurant_id);
  return (
    <OrdersManager
      initialOrders={orders}
      isOwner={session.staff.role === "owner"}
    />
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <OrdersContent />
    </Suspense>
  );
}
