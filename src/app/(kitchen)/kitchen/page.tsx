import { Suspense } from "react";
import { requireStaffRole } from "@/lib/auth/session";
import { fetchKitchenSnapshot } from "@/services/kitchen-server";
import { KitchenBoard } from "@/components/kitchen/KitchenBoard";
import { PageShellSkeleton } from "@/components/shared/PageShellSkeleton";

async function KitchenBoardLoader() {
  const session = await requireStaffRole(["owner", "manager", "kitchen"]);
  const snapshot = await fetchKitchenSnapshot(session.staff.restaurant_id);

  return (
    <KitchenBoard
      restaurantId={session.staff.restaurant_id}
      staffRole={session.staff.role}
      initialOrders={snapshot.orders}
      initialWaiterCalls={snapshot.waiterCalls}
    />
  );
}

export default function KitchenDashboardPage() {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <KitchenBoardLoader />
    </Suspense>
  );
}
