import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeDashboardAnalytics } from "@/services/analytics";
import type {
  AuditLog,
  Category,
  MenuItem,
  MenuItemAddon,
  MenuItemVariant,
  NotificationLog,
  Order,
  OrderItem,
  Restaurant,
  RestaurantTable,
  Review,
  StaffMember,
} from "@/types/database";

export async function getAdminOverviewData(restaurantId: string) {
  const admin = createSupabaseAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const { data: ordersData } = await admin
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false });

  const orders = (ordersData ?? []) as Order[];
  const orderIds = orders.map((o) => o.id);

  let orderItems: OrderItem[] = [];
  if (orderIds.length > 0) {
    const { data: itemsData } = await admin
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);
    orderItems = (itemsData ?? []) as OrderItem[];
  }

  return computeDashboardAnalytics(orders, orderItems);
}

export async function getAdminMenuData(restaurantId: string) {
  const admin = createSupabaseAdminClient();
  const [catRes, itemRes, varRes, addonRes] = await Promise.all([
    admin
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: true }),
    admin
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_archived", false)
      .order("sort_order", { ascending: true }),
    admin.from("menu_item_variants").select("*").order("sort_order", { ascending: true }),
    admin.from("menu_item_addons").select("*").order("sort_order", { ascending: true }),
  ]);

  const variantsByItem = new Map<string, MenuItemVariant[]>();
  for (const v of (varRes.data ?? []) as MenuItemVariant[]) {
    const arr = variantsByItem.get(v.menu_item_id) ?? [];
    arr.push({ ...v, price: Number(v.price) });
    variantsByItem.set(v.menu_item_id, arr);
  }

  const addonsByItem = new Map<string, MenuItemAddon[]>();
  for (const a of (addonRes.data ?? []) as MenuItemAddon[]) {
    const arr = addonsByItem.get(a.menu_item_id) ?? [];
    arr.push({ ...a, price: Number(a.price) });
    addonsByItem.set(a.menu_item_id, arr);
  }

  const items = ((itemRes.data ?? []) as MenuItem[]).map((item) => ({
    ...item,
    base_price: Number(item.base_price),
    gst_percent: Number(item.gst_percent),
    variants: variantsByItem.get(item.id) ?? [],
    addons: addonsByItem.get(item.id) ?? [],
  }));

  return {
    categories: (catRes.data ?? []) as Category[],
    items,
  };
}

export async function getAdminTablesData(restaurantId: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("restaurant_tables")
    .select(
      "id, restaurant_id, table_number, label, capacity, token_version, status, assigned_waiter_id, is_active, created_at, updated_at",
    )
    .eq("restaurant_id", restaurantId)
    .order("table_number", { ascending: true });

  return (data ?? []) as Omit<RestaurantTable, "qr_token_hash">[];
}

export async function getAdminStaffData(restaurantId: string) {
  const admin = createSupabaseAdminClient();
  const [staffRes, logsRes] = await Promise.all([
    admin
      .from("staff")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true }),
    admin
      .from("audit_logs")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return {
    staff: (staffRes.data ?? []) as StaffMember[],
    auditLogs: (logsRes.data ?? []) as AuditLog[],
  };
}

export async function getAdminOrdersData(restaurantId: string) {
  const admin = createSupabaseAdminClient();
  const [ordersRes, tablesRes] = await Promise.all([
    admin
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("restaurant_tables")
      .select("id, table_number")
      .eq("restaurant_id", restaurantId),
  ]);

  const tableMap = new Map<string, string>();
  for (const t of tablesRes.data ?? []) {
    tableMap.set(t.id, t.table_number);
  }

  const orders = (ordersRes.data ?? []) as Order[];
  const orderIds = orders.map((o) => o.id);
  const itemsByOrder = new Map<string, OrderItem[]>();

  if (orderIds.length > 0) {
    const { data: itemsData } = await admin
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);

    for (const item of (itemsData ?? []) as OrderItem[]) {
      const arr = itemsByOrder.get(item.order_id) ?? [];
      arr.push(item);
      itemsByOrder.set(item.order_id, arr);
    }
  }

  return orders.map((o) => ({
    ...o,
    subtotal: Number(o.subtotal),
    tax_amount: Number(o.tax_amount),
    service_charge: Number(o.service_charge),
    total_amount: Number(o.total_amount),
    table_number: tableMap.get(o.table_id) ?? "?",
    items: itemsByOrder.get(o.id) ?? [],
  }));
}

export async function getAdminRestaurantSettings(restaurantId: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("restaurants")
    .select("*")
    .eq("id", restaurantId)
    .single();

  return data as Restaurant | null;
}

export async function getAdminFeedbackAndNotificationsData(restaurantId: string) {
  const admin = createSupabaseAdminClient();
  const [reviewsRes, logsRes, ordersRes] = await Promise.all([
    admin
      .from("reviews")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("notification_logs")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("orders")
      .select("id, order_number")
      .eq("restaurant_id", restaurantId)
      .limit(300),
  ]);

  const orderMap = new Map<string, string>();
  for (const o of ordersRes.data ?? []) {
    orderMap.set(o.id, o.order_number);
  }

  const reviews = ((reviewsRes.data ?? []) as Review[]).map((r) => ({
    ...r,
    order_number: orderMap.get(r.order_id) ?? "Order",
  }));

  return {
    reviews,
    notifications: (logsRes.data ?? []) as NotificationLog[],
  };
}
