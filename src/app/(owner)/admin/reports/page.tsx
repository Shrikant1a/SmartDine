import { Suspense } from "react";
import { Download } from "lucide-react";
import { requireStaffRole } from "@/lib/auth/session";
import { getAdminOverviewData } from "@/services/admin-server";
import { formatINR } from "@/services/pricing";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OverviewCharts } from "@/components/dashboard/OverviewCharts";
import { PageShellSkeleton } from "@/components/shared/PageShellSkeleton";

async function ReportsContent() {
  const session = await requireStaffRole(["owner", "manager"]);
  const analytics = await getAdminOverviewData(session.staff.restaurant_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales &amp; Operations Reports</h1>
          <p className="text-sm text-muted-foreground">
            Daily, weekly, and 30-day revenue metrics, best-selling items, payment split, and CSV export.
          </p>
        </div>
        <a
          href="/api/admin/reports/csv"
          download
          className={buttonVariants({ variant: "default" })}
        >
          <Download className="mr-2 h-4 w-4" />
          Export Orders CSV
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatINR(analytics.todaySales)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid Collected (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-700">
            {formatINR(analytics.paidAmount)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Collection
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-700">
            {formatINR(analytics.pendingPaymentAmount)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancelled Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-rose-700">
            {analytics.cancelledOrders}
          </CardContent>
        </Card>
      </div>

      <OverviewCharts analytics={analytics} />
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <ReportsContent />
    </Suspense>
  );
}
