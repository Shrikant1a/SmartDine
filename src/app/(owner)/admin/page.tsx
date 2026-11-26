import { Suspense } from "react";
import dynamic from "next/dynamic";
import { requireStaffRole } from "@/lib/auth/session";
import { getAdminOverviewData } from "@/services/admin-server";
import { formatINR } from "@/services/pricing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShellSkeleton } from "@/components/shared/PageShellSkeleton";

const OverviewCharts = dynamic(
  () => import("@/components/dashboard/OverviewCharts").then((m) => m.OverviewCharts),
  {
    loading: () => (
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 w-full animate-pulse rounded-xl border bg-card/60 p-6" />
        <div className="h-80 w-full animate-pulse rounded-xl border bg-card/60 p-6" />
      </div>
    ),
  },
);

async function OverviewContent() {
  const session = await requireStaffRole(["owner", "manager"]);
  const analytics = await getAdminOverviewData(session.staff.restaurant_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground">
          Live sales, order counts, popular dishes, and payment summary from PostgreSQL.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Today's Sales", value: formatINR(analytics.todaySales), sub: `${analytics.todayOrders} orders today` },
          { label: "Total Orders (30d)", value: String(analytics.totalOrders), sub: `${analytics.cancelledOrders} cancelled` },
          { label: "Pending Orders", value: String(analytics.pendingOrders), sub: "Active in kitchen / ready" },
          { label: "Completed Orders", value: String(analytics.completedOrders), sub: "Served to guests" },
          { label: "Avg Order Value", value: formatINR(analytics.averageOrderValue), sub: `Paid: ${formatINR(analytics.paidAmount)}` },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-1">
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-2xl font-bold">{kpi.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{kpi.sub}</CardContent>
          </Card>
        ))}
      </div>

      <OverviewCharts analytics={analytics} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Popular Food Items</CardTitle>
            <CardDescription>Top-selling items over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {analytics.popularItems.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No completed order items yet.
              </p>
            ) : (
              analytics.popularItems.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} sold
                    </p>
                  </div>
                  <span className="font-semibold">{formatINR(item.revenue)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Summary</CardTitle>
            <CardDescription>Split across Razorpay, Cash at Table, and Counter</CardDescription>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {analytics.paymentSplit.map((row) => (
              <div
                key={row.mode}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.count} orders</p>
                </div>
                <span className="font-semibold">{formatINR(row.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <OverviewContent />
    </Suspense>
  );
}
