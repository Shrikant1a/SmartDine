import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireStaffRole } from "@/lib/auth/session";
import { fetchKitchenSnapshot } from "@/services/kitchen-server";
import { KitchenBoard } from "@/components/kitchen/KitchenBoard";
import { PageShellSkeleton } from "@/components/shared/PageShellSkeleton";
import { buttonVariants } from "@/components/ui/button";

async function AdminKitchenLoader() {
  const session = await requireStaffRole(["owner", "manager"]);
  const snapshot = await fetchKitchenSnapshot(session.staff.restaurant_id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kitchen Display System (KDS)</h1>
          <p className="text-sm text-muted-foreground">
            Live real-time board for incoming, preparing, and ready kitchen orders.
          </p>
        </div>
        <Link
          href="/kitchen"
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ExternalLink className="mr-2 h-3.5 w-3.5" />
          Open Dedicated Kitchen Screen
        </Link>
      </div>

      <KitchenBoard
        restaurantId={session.staff.restaurant_id}
        staffRole={session.staff.role}
        initialOrders={snapshot.orders}
        initialWaiterCalls={snapshot.waiterCalls}
      />
    </div>
  );
}

export default function AdminKitchenPage() {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <AdminKitchenLoader />
    </Suspense>
  );
}
