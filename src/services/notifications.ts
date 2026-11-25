import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/client";
import { computeDashboardAnalytics } from "@/services/analytics";
import { formatINR } from "@/services/pricing";
import type { Order, OrderItem } from "@/types/database";

async function dispatchAndLog(params: {
  restaurantId: string;
  orderId?: string | null;
  eventType: string;
  recipient: string;
  templateName: string;
  bodyParameters: string[];
}) {
  const admin = createSupabaseAdminClient();

  // Deduplicate order-scoped notifications (except repeatable daily reports)
  if (params.orderId) {
    const { data: existing } = await admin
      .from("notification_logs")
      .select("id")
      .eq("order_id", params.orderId)
      .eq("event_type", params.eventType)
      .eq("recipient", params.recipient)
      .in("status", ["sent", "skipped"])
      .maybeSingle();

    if (existing) return;
  }

  const result = await sendWhatsAppTemplate({
    to: params.recipient,
    templateName: params.templateName,
    bodyParameters: params.bodyParameters,
  });

  await admin.from("notification_logs").insert({
    restaurant_id: params.restaurantId,
    order_id: params.orderId ?? null,
    channel: "whatsapp",
    event_type: params.eventType,
    recipient: params.recipient,
    template_name: params.templateName,
    payload: { parameters: params.bodyParameters },
    status: result.status,
    provider_message_id: result.providerMessageId ?? null,
    error_message: result.errorMessage ?? null,
    sent_at: result.status === "sent" ? new Date().toISOString() : null,
  });
}

export async function notifyNewOrderAndStock(params: {
  restaurantId: string;
  orderId: string;
  orderNumber: string;
  tableNumber: string;
  totalAmount: number;
  menuItemIds: string[];
}) {
  const admin = createSupabaseAdminClient();
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("owner_whatsapp, kitchen_whatsapp")
    .eq("id", params.restaurantId)
    .maybeSingle();

  const totalFormatted = formatINR(params.totalAmount);

  if (restaurant?.owner_whatsapp) {
    await dispatchAndLog({
      restaurantId: params.restaurantId,
      orderId: params.orderId,
      eventType: "order.new.owner",
      recipient: restaurant.owner_whatsapp,
      templateName: "smartdine_new_order",
      bodyParameters: [
        params.orderNumber,
        `Table ${params.tableNumber}`,
        totalFormatted,
      ],
    });
  }

  if (restaurant?.kitchen_whatsapp) {
    await dispatchAndLog({
      restaurantId: params.restaurantId,
      orderId: params.orderId,
      eventType: "order.new.kitchen",
      recipient: restaurant.kitchen_whatsapp,
      templateName: "smartdine_new_order",
      bodyParameters: [
        params.orderNumber,
        `Table ${params.tableNumber}`,
        totalFormatted,
      ],
    });
  }

  // Low-stock / sold-out alerts to owner
  if (restaurant?.owner_whatsapp && params.menuItemIds.length > 0) {
    const { data: lowStockItems } = await admin
      .from("menu_items")
      .select("id, name, stock_qty, low_stock_threshold")
      .in("id", params.menuItemIds)
      .not("stock_qty", "is", null);

    for (const item of lowStockItems ?? []) {
      if (
        typeof item.stock_qty === "number" &&
        item.stock_qty <= item.low_stock_threshold
      ) {
        await dispatchAndLog({
          restaurantId: params.restaurantId,
          orderId: params.orderId,
          eventType: `stock.low.${item.id}`,
          recipient: restaurant.owner_whatsapp,
          templateName: "smartdine_low_stock",
          bodyParameters: [item.name, String(item.stock_qty)],
        });
      }
    }
  }
}

export async function notifyCustomerOrderReady(params: {
  restaurantId: string;
  orderId: string;
  orderNumber: string;
  tableNumber: string;
  customerPhone: string | null;
  whatsappConsent: boolean;
}) {
  if (!params.whatsappConsent || !params.customerPhone) return;

  await dispatchAndLog({
    restaurantId: params.restaurantId,
    orderId: params.orderId,
    eventType: "order.ready.customer",
    recipient: params.customerPhone,
    templateName: "smartdine_order_ready",
    bodyParameters: [params.orderNumber, `Table ${params.tableNumber}`],
  });
}

export async function sendDailySalesSummary(restaurantId: string) {
  const admin = createSupabaseAdminClient();
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("owner_whatsapp, name")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restaurant?.owner_whatsapp) {
    return {
      ok: false,
      status: "skipped" as const,
      message: "Owner WhatsApp number is not configured in Restaurant Settings.",
    };
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: ordersData } = await admin
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", thirtyDaysAgo);

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

  const analytics = computeDashboardAnalytics(orders, orderItems);
  const topDishes =
    analytics.popularItems
      .slice(0, 3)
      .map((i) => `${i.name} (${i.quantity})`)
      .join(", ") || "No orders yet";

  await dispatchAndLog({
    restaurantId,
    eventType: `report.daily.${new Date().toISOString().slice(0, 10)}`,
    recipient: restaurant.owner_whatsapp,
    templateName: "smartdine_daily_summary",
    bodyParameters: [
      String(analytics.todayOrders),
      formatINR(analytics.todaySales),
      topDishes,
    ],
  });

  return {
    ok: true,
    todayOrders: analytics.todayOrders,
    todaySales: analytics.todaySales,
  };
}
