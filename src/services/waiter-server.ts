import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Order, OrderItem, RestaurantTable, WaiterCall } from "@/types/database";

export interface WaiterCallWithTable extends WaiterCall {
  table_number: string;
  table_label: string | null;
}

export interface WaiterOrderView extends Order {
  table_number: string;
  items: OrderItem[];
}

export async function fetchWaiterDashboardSnapshot(
  restaurantId: string,
  staffId: string,
  role: string,
) {
  const admin = createSupabaseAdminClient();

  const [callsRes, tablesRes, ordersRes] = await Promise.all([
    admin
      .from("waiter_calls")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .in("status", ["open", "acknowledged"])
      .order("created_at", { ascending: true }),
    admin
      .from("restaurant_tables")
      .select(
        "id, restaurant_id, table_number, label, capacity, token_version, status, assigned_waiter_id, is_active, created_at, updated_at",
      )
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("table_number", { ascending: true }),
    admin
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .or("status.eq.ready,and(status.eq.served,payment_status.eq.pending)")
      .order("created_at", { ascending: true })
      .limit(60),
  ]);

  const tables = (tablesRes.data ?? []) as Omit<RestaurantTable, "qr_token_hash">[];
  const tableMap = new Map<string, { table_number: string; label: string | null }>();
  for (const t of tables) {
    tableMap.set(t.id, { table_number: t.table_number, label: t.label });
  }

  // If waiter has assigned tables, prioritize/filter or show all when none assigned
  const assignedTables = tables.filter((t) => t.assigned_waiter_id === staffId);
  const relevantTables =
    role === "waiter" && assignedTables.length > 0 ? assignedTables : tables;

  const orders = (ordersRes.data ?? []) as Order[];
  const orderIds = orders.map((o) => o.id);
  const itemsByOrder = new Map<string, OrderItem[]>();

  if (orderIds.length > 0) {
    const { data: itemsData } = await admin
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);

    for (const item of (itemsData ?? []) as OrderItem[]) {
      const list = itemsByOrder.get(item.order_id) ?? [];
      list.push(item);
      itemsByOrder.set(item.order_id, list);
    }
  }

  const waiterCalls: WaiterCallWithTable[] = ((callsRes.data ?? []) as WaiterCall[]).map(
    (c) => ({
      ...c,
      table_number: tableMap.get(c.table_id)?.table_number ?? "?",
      table_label: tableMap.get(c.table_id)?.label ?? null,
    }),
  );

  const serviceOrders: WaiterOrderView[] = orders.map((o) => ({
    ...o,
    subtotal: Number(o.subtotal),
    tax_amount: Number(o.tax_amount),
    service_charge: Number(o.service_charge),
    total_amount: Number(o.total_amount),
    table_number: tableMap.get(o.table_id)?.table_number ?? "?",
    items: itemsByOrder.get(o.id) ?? [],
  }));

  return {
    waiterCalls,
    serviceOrders,
    tables: relevantTables,
  };
}
