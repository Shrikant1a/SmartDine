import "server-only";
import { getServerEnv } from "@/lib/env-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hashQrToken } from "@/lib/security/qr";
import type {
  Category,
  MenuItem,
  MenuItemAddon,
  MenuItemVariant,
  Order,
  OrderItem,
} from "@/types/database";

export interface PublicRestaurantInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  address: string | null;
  default_gst_percent: number;
  google_review_url: string | null;
  is_open: boolean;
}

export interface MenuItemWithOptions extends MenuItem {
  variants: MenuItemVariant[];
  addons: MenuItemAddon[];
}

export interface ResolvedTableInfo {
  id: string;
  restaurant_id: string;
  table_number: string;
  label: string | null;
  token_version: number;
}

export interface CustomerMenuCatalog {
  restaurant: PublicRestaurantInfo;
  categories: Category[];
  items: MenuItemWithOptions[];
}

export async function resolveTableByRawToken(
  rawToken: string,
): Promise<ResolvedTableInfo | null> {
  const env = getServerEnv();
  const tokenHash = hashQrToken(rawToken, env.QR_TOKEN_SECRET);
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("restaurant_tables")
    .select("id, restaurant_id, table_number, label, token_version, is_active")
    .eq("qr_token_hash", tokenHash)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    restaurant_id: data.restaurant_id,
    table_number: data.table_number,
    label: data.label,
    token_version: data.token_version,
  };
}

export async function getCustomerMenuCatalog(): Promise<CustomerMenuCatalog | null> {
  const supabase = await createSupabaseServerClient();

  const { data: restRows, error: restError } = await supabase.rpc(
    "get_public_restaurant_info",
  );
  if (restError || !Array.isArray(restRows) || restRows.length === 0) {
    return null;
  }

  const restaurant = restRows[0] as PublicRestaurantInfo;

  const [catRes, itemRes, varRes, addonRes] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_archived", false)
      .order("sort_order", { ascending: true }),
    supabase
      .from("menu_item_variants")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("menu_item_addons")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  if (catRes.error || itemRes.error) {
    throw new Error("Failed to load menu catalog");
  }

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

  const items: MenuItemWithOptions[] = ((itemRes.data ?? []) as MenuItem[]).map(
    (item) => ({
      ...item,
      base_price: Number(item.base_price),
      gst_percent: Number(item.gst_percent),
      variants: variantsByItem.get(item.id) ?? [],
      addons: addonsByItem.get(item.id) ?? [],
    }),
  );

  return {
    restaurant: {
      ...restaurant,
      default_gst_percent: Number(restaurant.default_gst_percent),
    },
    categories: (catRes.data ?? []) as Category[],
    items,
  };
}

export async function getVerifiedCustomerOrder(orderId: string, tableId: string) {
  const admin = createSupabaseAdminClient();

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("table_id", tableId)
    .maybeSingle();

  if (orderErr || !order) return null;

  const [{ data: items }, { data: table }] = await Promise.all([
    admin
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),
    admin
      .from("restaurant_tables")
      .select("table_number, label")
      .eq("id", tableId)
      .maybeSingle(),
  ]);

  return {
    order: {
      ...(order as Order),
      subtotal: Number(order.subtotal),
      tax_amount: Number(order.tax_amount),
      service_charge: Number(order.service_charge),
      total_amount: Number(order.total_amount),
    },
    items: ((items ?? []) as OrderItem[]).map((it) => ({
      ...it,
      unit_price_snapshot: Number(it.unit_price_snapshot),
      addons_total_snapshot: Number(it.addons_total_snapshot),
      gst_percent_snapshot: Number(it.gst_percent_snapshot),
      line_total: Number(it.line_total),
    })),
    tableNumber: table?.table_number ?? "Table",
    tableLabel: table?.label ?? null,
  };
}
