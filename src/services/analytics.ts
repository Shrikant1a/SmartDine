import type { Order, OrderItem } from "@/types/database";
import { roundCurrency } from "@/services/pricing";

export interface DailySalesPoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

export interface PopularItemStat {
  name: string;
  quantity: number;
  revenue: number;
}

export interface PaymentSplitStat {
  mode: string;
  label: string;
  count: number;
  amount: number;
}

export interface DashboardAnalytics {
  todaySales: number;
  todayOrders: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  paidAmount: number;
  pendingPaymentAmount: number;
  dailyChart: DailySalesPoint[];
  weeklyChart: DailySalesPoint[];
  popularItems: PopularItemStat[];
  paymentSplit: PaymentSplitStat[];
}

function toIstDateKey(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatShortDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  return dt.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function computeDashboardAnalytics(
  orders: Order[],
  orderItems: OrderItem[],
  now = new Date(),
): DashboardAnalytics {
  const todayKey = toIstDateKey(now.toISOString());

  let todaySales = 0;
  let todayOrders = 0;
  let pendingOrders = 0;
  let completedOrders = 0;
  let cancelledOrders = 0;
  let nonCancelledRevenue = 0;
  let nonCancelledCount = 0;
  let paidAmount = 0;
  let pendingPaymentAmount = 0;

  const dailyMap = new Map<string, { revenue: number; orders: number }>();

  // Pre-seed last 7 days so chart always shows contiguous timeline
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(now.getTime() - i * 86_400_000);
    const key = toIstDateKey(dt.toISOString());
    dailyMap.set(key, { revenue: 0, orders: 0 });
  }

  const paymentMap = new Map<string, { count: number; amount: number }>([
    ["online", { count: 0, amount: 0 }],
    ["cash_table", { count: 0, amount: 0 }],
    ["counter", { count: 0, amount: 0 }],
  ]);

  const nonCancelledOrderIds = new Set<string>();

  for (const order of orders) {
    const amount = Number(order.total_amount) || 0;
    const dateKey = toIstDateKey(order.created_at);

    if (order.status === "cancelled") {
      cancelledOrders += 1;
      continue;
    }

    nonCancelledOrderIds.add(order.id);
    nonCancelledCount += 1;
    nonCancelledRevenue += amount;

    if (order.status === "served") {
      completedOrders += 1;
    } else {
      pendingOrders += 1;
    }

    if (order.payment_status === "paid") {
      paidAmount += amount;
    } else if (order.payment_status === "pending") {
      pendingPaymentAmount += amount;
    }

    if (dateKey === todayKey) {
      todayOrders += 1;
      todaySales += amount;
    }

    const existingDay = dailyMap.get(dateKey) ?? { revenue: 0, orders: 0 };
    dailyMap.set(dateKey, {
      revenue: roundCurrency(existingDay.revenue + amount),
      orders: existingDay.orders + 1,
    });

    const pEntry = paymentMap.get(order.payment_mode) ?? { count: 0, amount: 0 };
    paymentMap.set(order.payment_mode, {
      count: pEntry.count + 1,
      amount: roundCurrency(pEntry.amount + amount),
    });
  }

  const sortedDays = Array.from(dailyMap.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const dailyChart: DailySalesPoint[] = sortedDays.slice(-7).map(([date, v]) => ({
    date,
    label: formatShortDate(date),
    revenue: v.revenue,
    orders: v.orders,
  }));

  // Group into last 4 rolling 7-day buckets for weekly chart
  const weeklyChart: DailySalesPoint[] = [];
  for (let w = 3; w >= 0; w--) {
    const startMs = now.getTime() - (w + 1) * 7 * 86_400_000;
    const endMs = now.getTime() - w * 7 * 86_400_000;
    let rev = 0;
    let cnt = 0;
    for (const order of orders) {
      if (order.status === "cancelled") continue;
      const ms = new Date(order.created_at).getTime();
      if (ms > startMs && ms <= endMs) {
        rev += Number(order.total_amount) || 0;
        cnt += 1;
      }
    }
    weeklyChart.push({
      date: `W-${w}`,
      label: w === 0 ? "This Week" : `${w}w ago`,
      revenue: roundCurrency(rev),
      orders: cnt,
    });
  }

  const itemAgg = new Map<string, { quantity: number; revenue: number }>();
  for (const item of orderItems) {
    if (!nonCancelledOrderIds.has(item.order_id)) continue;
    const prev = itemAgg.get(item.item_name_snapshot) ?? {
      quantity: 0,
      revenue: 0,
    };
    itemAgg.set(item.item_name_snapshot, {
      quantity: prev.quantity + item.quantity,
      revenue: roundCurrency(prev.revenue + Number(item.line_total)),
    });
  }

  const popularItems: PopularItemStat[] = Array.from(itemAgg.entries())
    .map(([name, val]) => ({ name, ...val }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  const MODE_LABELS: Record<string, string> = {
    online: "Online (Razorpay)",
    cash_table: "Cash at Table",
    counter: "Pay at Counter",
  };

  const paymentSplit: PaymentSplitStat[] = Array.from(paymentMap.entries()).map(
    ([mode, val]) => ({
      mode,
      label: MODE_LABELS[mode] ?? mode,
      count: val.count,
      amount: val.amount,
    }),
  );

  return {
    todaySales: roundCurrency(todaySales),
    todayOrders,
    totalOrders: orders.length,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    averageOrderValue:
      nonCancelledCount > 0
        ? roundCurrency(nonCancelledRevenue / nonCancelledCount)
        : 0,
    paidAmount: roundCurrency(paidAmount),
    pendingPaymentAmount: roundCurrency(pendingPaymentAmount),
    dailyChart,
    weeklyChart,
    popularItems,
    paymentSplit,
  };
}

/**
 * Escapes a single CSV field according to RFC 4180 and neutralizes CSV formula injection.
 */
export function escapeCsvCell(raw: string | number | null | undefined): string {
  const str = raw === null || raw === undefined ? "" : String(raw);
  const formulaSafe = /^[=+\-@]/.test(str) ? `'${str}` : str;
  if (/[",\n\r]/.test(formulaSafe)) {
    return `"${formulaSafe.replace(/"/g, '""')}"`;
  }
  return formulaSafe;
}

export function buildOrdersCsvReport(
  orders: Array<Order & { table_number?: string }>,
): string {
  const headers = [
    "Order Number",
    "Date (IST)",
    "Table",
    "Order Status",
    "Payment Mode",
    "Payment Status",
    "Subtotal (INR)",
    "Tax (INR)",
    "Service Charge (INR)",
    "Total (INR)",
    "Customer Name",
  ];

  const rows = orders.map((o) =>
    [
      o.order_number,
      new Date(o.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      o.table_number ?? "",
      o.status,
      o.payment_mode,
      o.payment_status,
      Number(o.subtotal).toFixed(2),
      Number(o.tax_amount).toFixed(2),
      Number(o.service_charge).toFixed(2),
      Number(o.total_amount).toFixed(2),
      o.customer_name ?? "",
    ]
      .map(escapeCsvCell)
      .join(","),
  );

  return [headers.map(escapeCsvCell).join(","), ...rows].join("\n");
}
