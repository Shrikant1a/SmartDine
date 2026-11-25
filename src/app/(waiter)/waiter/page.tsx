import { Suspense } from "react";
import { requireStaffRole } from "@/lib/auth/session";
import { fetchWaiterDashboardSnapshot } from "@/services/waiter-server";
import { WaiterDashboardClient } from "@/components/waiter/WaiterDashboardClient";
import { PageShellSkeleton } from "@/components/shared/PageShellSkeleton";

async function WaiterLoader() {
  const session = await requireStaffRole(["owner", "manager", "waiter"]);
  const snapshot = await fetchWaiterDashboardSnapshot(
    session.staff.restaurant_id,
    session.staff.id,
    session.staff.role,
  );

  return (
    <WaiterDashboardClient
      restaurantId={session.staff.restaurant_id}
      initialWaiterCalls={snapshot.waiterCalls}
      initialOrders={snapshot.serviceOrders}
      initialTables={snapshot.tables}
    />
  );
}

export default function WaiterDashboardPage() {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <WaiterLoader />
    </Suspense>
  );
}
