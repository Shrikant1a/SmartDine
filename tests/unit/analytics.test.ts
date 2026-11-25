import { describe, expect, it } from "vitest";
import {
  buildOrdersCsvReport,
  computeDashboardAnalytics,
  escapeCsvCell,
} from "@/services/analytics";
import type { Order, OrderItem } from "@/types/database";

const NOW = new Date("2026-11-25T15:00:00+05:30");

const SAMPLE_ORDERS: Order[] = [
  {
    id: "o1",
    restaurant_id: "r1",
    table_id: "t1",
    order_number: "SD-20261125-1001",
    idempotency_key: null,
    status: "served",
    payment_mode: "cash_table",
    payment_status: "paid",
    subtotal: 400,
    tax_amount: 20,
    service_charge: 0,
    total_amount: 420,
    customer_name: "Priya",
    customer_phone: null,
    special_instructions: null,
    accepted_at: null,
    ready_at: null,
    served_at: null,
    cancelled_at: null,
    cancel_reason: null,
    created_at: "2026-11-25T12:00:00+05:30",
    updated_at: "2026-11-25T12:20:00+05:30",
  },
  {
    id: "o2",
    restaurant_id: "r1",
    table_id: "t2",
    order_number: "SD-20261125-1002",
    idempotency_key: null,
    status: "preparing",
    payment_mode: "online",
    payment_status: "pending",
    subtotal: 200,
    tax_amount: 10,
    service_charge: 0,
    total_amount: 210,
    customer_name: null,
    customer_phone: null,
    special_instructions: null,
    accepted_at: null,
    ready_at: null,
    served_at: null,
    cancelled_at: null,
    cancel_reason: null,
    created_at: "2026-11-25T13:00:00+05:30",
    updated_at: "2026-11-25T13:05:00+05:30",
  },
  {
    id: "o3",
    restaurant_id: "r1",
    table_id: "t3",
    order_number: "SD-20261125-1003",
    idempotency_key: null,
    status: "cancelled",
    payment_mode: "counter",
    payment_status: "pending",
    subtotal: 500,
    tax_amount: 25,
    service_charge: 0,
    total_amount: 525,
    customer_name: null,
    customer_phone: null,
    special_instructions: null,
    accepted_at: null,
    ready_at: null,
    served_at: null,
    cancelled_at: null,
    cancel_reason: "Guest changed mind",
    created_at: "2026-11-25T13:30:00+05:30",
    updated_at: "2026-11-25T13:35:00+05:30",
  },
];

const SAMPLE_ITEMS: OrderItem[] = [
  {
    id: "oi1",
    order_id: "o1",
    menu_item_id: "m1",
    item_name_snapshot: "Paneer Pizza",
    variant_name_snapshot: "Medium",
    addons_snapshot: [],
    unit_price_snapshot: 200,
    addons_total_snapshot: 0,
    gst_percent_snapshot: 5,
    quantity: 2,
    line_total: 400,
    special_instructions: null,
    created_at: "2026-11-25T12:00:00+05:30",
  },
  {
    id: "oi2",
    order_id: "o3",
    menu_item_id: "m2",
    item_name_snapshot: "Cancelled Item",
    variant_name_snapshot: null,
    addons_snapshot: [],
    unit_price_snapshot: 500,
    addons_total_snapshot: 0,
    gst_percent_snapshot: 5,
    quantity: 1,
    line_total: 500,
    special_instructions: null,
    created_at: "2026-11-25T13:30:00+05:30",
  },
];

describe("Admin analytics & CSV export", () => {
  it("computes today sales, averages, popular items, and excludes cancelled orders", () => {
    const res = computeDashboardAnalytics(SAMPLE_ORDERS, SAMPLE_ITEMS, NOW);

    expect(res.todaySales).toBe(630);
    expect(res.todayOrders).toBe(2);
    expect(res.totalOrders).toBe(3);
    expect(res.completedOrders).toBe(1);
    expect(res.pendingOrders).toBe(1);
    expect(res.cancelledOrders).toBe(1);
    expect(res.averageOrderValue).toBe(315);
    expect(res.paidAmount).toBe(420);
    expect(res.pendingPaymentAmount).toBe(210);
    expect(res.popularItems).toEqual([
      { name: "Paneer Pizza", quantity: 2, revenue: 400 },
    ]);
  });

  it("escapes CSV cells and prevents spreadsheet formula injection", () => {
    expect(escapeCsvCell("=CMD('calc')")).toBe("'=CMD('calc')");
    expect(escapeCsvCell('Paneer, "Large"')).toBe('"Paneer, ""Large"""');

    const csv = buildOrdersCsvReport([{ ...SAMPLE_ORDERS[0], table_number: "T1" }]);
    expect(csv).toContain("Order Number,Date (IST),Table");
    expect(csv).toContain("SD-20261125-1001");
    expect(csv).toContain("420.00");
  });
});
