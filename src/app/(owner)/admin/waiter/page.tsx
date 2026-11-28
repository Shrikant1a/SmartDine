import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireStaffRole } from "@/lib/auth/session";
import { fetchWaiterDashboardSnapshot } from "@/services/waiter-server";
import { WaiterDashboardClient } from "@/components/waiter/WaiterDashboardClient";
import { PageShellSkeleton } from "@/components/shared/PageShellSkeleton";
import { buttonVariants } from "@/components/ui/button";

async function AdminWaiterLoader() {
  const session = await requireStaffRole(["owner", "manager"]);
  const snapshot = await fetchWaiterDashboardSnapshot(
    session.staff.restaurant_id,
    session.staff.id,
    session.staff.role,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Waiter Service Portal</h1>
          <p className="text-sm text-muted-foreground">
            Live table assistance calls, ready dishes for service, and cash bill collections.
          </p>
        </div>
        <Link
          href="/waiter"
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ExternalLink className="mr-2 h-3.5 w-3.5" />
          Open Dedicated Waiter Screen
        </Link>
      </div>

      <WaiterDashboardClient
        restaurantId={session.staff.restaurant_id}
        initialWaiterCalls={snapshot.waiterCalls}
        initialOrders={snapshot.serviceOrders}
        initialTables={snapshot.tables}
      />
    </div>
  );
}

export default function AdminWaiterPage() {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <AdminWaiterLoader />
    </Suspense>
  );
}
