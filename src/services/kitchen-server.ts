import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Order, OrderItem, WaiterCall } from "@/types/database";
import type { KitchenOrderView, KitchenWaiterCallView } from "@/services/kitchen";

export async function fetchKitchenSnapshot(restaurantId: string): Promise<{
  orders: KitchenOrderView[];
  waiterCalls: KitchenWaiterCallView[];
}> {
  const admin = createSupabaseAdminClient();

  const [ordersRes, tablesRes, callsRes] = await Promise.all([
    admin
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .in("status", ["new", "preparing", "ready"])
      .order("created_at", { ascending: true }),
    admin
      .from("restaurant_tables")
      .select("id, table_number, label")
      .eq("restaurant_id", restaurantId),
    admin
      .from("waiter_calls")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .in("status", ["open", "acknowledged"])
      .order("created_at", { ascending: true }),
  ]);

  if (ordersRes.error) {
    throw new Error(ordersRes.error.message);
  }

  const tableMap = new Map<string, { table_number: string; label: string | null }>();
  for (const t of tablesRes.data ?? []) {
    tableMap.set(t.id, { table_number: t.table_number, label: t.label });
  }

  const rawOrders = (ordersRes.data ?? []) as Order[];
  const orderIds = rawOrders.map((o) => o.id);

  const itemsByOrder = new Map<string, OrderItem[]>();
  if (orderIds.length > 0) {
    const { data: itemsData, error: itemsErr } = await admin
      .from("order_items")
      .select("*")
      .in("order_id", orderIds)
      .order("created_at", { ascending: true });

    if (itemsErr) {
      throw new Error(itemsErr.message);
    }

    for (const item of (itemsData ?? []) as OrderItem[]) {
      const list = itemsByOrder.get(item.order_id) ?? [];
      list.push({
        ...item,
        unit_price_snapshot: Number(item.unit_price_snapshot),
        addons_total_snapshot: Number(item.addons_total_snapshot),
        gst_percent_snapshot: Number(item.gst_percent_snapshot),
        line_total: Number(item.line_total),
      });
      itemsByOrder.set(item.order_id, list);
    }
  }

  const orders: KitchenOrderView[] = rawOrders.map((order) => {
    const tbl = tableMap.get(order.table_id);
    return {
      ...order,
      subtotal: Number(order.subtotal),
      tax_amount: Number(order.tax_amount),
      service_charge: Number(order.service_charge),
      total_amount: Number(order.total_amount),
      table_number: tbl?.table_number ?? "?",
      table_label: tbl?.label ?? null,
      items: itemsByOrder.get(order.id) ?? [],
    };
  });

  const waiterCalls: KitchenWaiterCallView[] = ((callsRes.data ?? []) as WaiterCall[]).map(
    (call) => {
      const tbl = tableMap.get(call.table_id);
      return {
        ...call,
        table_number: tbl?.table_number ?? "?",
        table_label: tbl?.label ?? null,
      };
    },
  );

  return { orders, waiterCalls };
}
