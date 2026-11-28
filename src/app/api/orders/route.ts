import { NextResponse, type NextRequest } from "next/server";
import { getVerifiedTableSession } from "@/lib/security/table-session";
import { createOrderSchema } from "@/lib/validation/order";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { notifyNewOrderAndStock } from "@/services/notifications";
import { resolveTableByRawToken } from "@/services/customer-menu";
import type { Order, OrderItem } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    const session = await getVerifiedTableSession();
    if (!session) {
      return NextResponse.json(
        { error: "Your table session has expired. Please scan your table QR code again." },
        { status: 401 },
      );
    }

    // Rate limit per table: max 5 order placements per 10 minutes
    const limit = checkRateLimit(`order:${session.tableId}`, 5, 10 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `Too many orders placed from Table ${session.tableNumber}. Please wait ${limit.retryAfterSeconds}s or call a waiter.`,
        },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid order request" },
        { status: 400 },
      );
    }

    if (parsed.data.paymentMode === "online") {
      const razorpayReady = Boolean(
        process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
      );
      if (!razorpayReady) {
        return NextResponse.json(
          {
            error:
              "Online payment via Razorpay is not configured yet. Please select Cash at Table or Pay at Counter.",
          },
          { status: 400 },
        );
      }
    }

    const admin = createSupabaseAdminClient();
    const { data: createdOrder, error } = await admin.rpc("create_order_atomic", {
      p_restaurant_id: session.restaurantId,
      p_table_id: session.tableId,
      p_payment_mode: parsed.data.paymentMode,
      p_customer_name: parsed.data.customerName || null,
      p_customer_phone: parsed.data.customerPhone || null,
      p_special_instructions: parsed.data.specialInstructions || null,
      p_idempotency_key: parsed.data.idempotencyKey,
      p_items: parsed.data.items,
    });

    if (error || !createdOrder) {
      const message = error?.message || "Could not place order. Please review your cart.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (parsed.data.whatsappConsent) {
      await admin
        .from("orders")
        .update({ whatsapp_consent: true })
        .eq("id", createdOrder.id);
    }

    // Dispatch WhatsApp alerts (new order + low stock) safely without failing order response
    await notifyNewOrderAndStock({
      restaurantId: session.restaurantId,
      orderId: createdOrder.id,
      orderNumber: createdOrder.order_number,
      tableNumber: session.tableNumber,
      totalAmount: Number(createdOrder.total_amount),
      menuItemIds: [...new Set(parsed.data.items.map((i) => i.menuItemId))],
    }).catch((notifyErr) => {
      console.error("[api/orders] Notification dispatch error:", notifyErr);
    });

    return NextResponse.json(
      {
        ok: true,
        order: createdOrder,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[api/orders POST] Error:", err);
    return NextResponse.json(
      { error: "Unable to place order right now. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    let tableId: string | null = null;
    let tableNumber: string = "Table";

    const token = request.nextUrl.searchParams.get("token");
    if (token) {
      const resolved = await resolveTableByRawToken(token);
      if (resolved) {
        tableId = resolved.id;
        tableNumber = resolved.table_number;
      }
    }

    if (!tableId) {
      const session = await getVerifiedTableSession();
      if (session) {
        tableId = session.tableId;
        tableNumber = session.tableNumber;
      }
    }

    if (!tableId) {
      return NextResponse.json({ error: "No active table session" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("orders")
      .select(
        "id, restaurant_id, table_id, order_number, status, payment_mode, payment_status, subtotal, tax_amount, service_charge, total_amount, special_instructions, accepted_at, ready_at, served_at, cancelled_at, cancel_reason, created_at, updated_at",
      )
      .eq("table_id", tableId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
    }

    const allTableOrders = (data ?? []) as Order[];
    const now = Date.now();

    // Determine active orders for the customer QR view:
    // 1. In-kitchen progress (placed, accepted, preparing, ready) -> always visible to track.
    // 2. Served orders awaiting bill payment (payment_status: pending) -> visible to bill and pay.
    // 3. Recently cancelled orders (< 10 mins) -> visible to inform customer of cancellation reason.
    // 4. Completed orders that are BOTH served AND paid are fully settled -> CLEARED from QR!
    // All historical and permanent data remains intact in Supabase for the Admin Panel.
    const activeOrders = allTableOrders.filter((o) => {
      if (o.status === "served" && o.payment_status === "paid") {
        return false;
      }
      if (o.status === "cancelled") {
        const ageMinutes = (now - new Date(o.created_at).getTime()) / (1000 * 60);
        return ageMinutes <= 10;
      }
      if (["placed", "accepted", "preparing", "ready"].includes(o.status)) {
        return true;
      }
      if (o.status === "served" && o.payment_status === "pending") {
        return true;
      }
      return false;
    });

    // Check if the table's most recent order was settled (paid) recently (< 5 minutes ago)
    const recentlySettled =
      activeOrders.length === 0 &&
      allTableOrders.some(
        (o) =>
          o.payment_status === "paid" &&
          (now - new Date(o.updated_at || o.created_at).getTime()) / (1000 * 60) <= 5,
      );

    const orderIds = activeOrders.map((o) => o.id);
    const itemsByOrder = new Map<string, OrderItem[]>();

    if (orderIds.length > 0) {
      const { data: itemsData } = await admin
        .from("order_items")
        .select("*")
        .in("order_id", orderIds)
        .order("created_at", { ascending: true });

      for (const item of (itemsData ?? []) as OrderItem[]) {
        const arr = itemsByOrder.get(item.order_id) ?? [];
        arr.push(item);
        itemsByOrder.set(item.order_id, arr);
      }
    }

    const enrichedOrders = activeOrders.map((o) => ({
      ...o,
      subtotal: Number(o.subtotal),
      tax_amount: Number(o.tax_amount),
      service_charge: Number(o.service_charge),
      total_amount: Number(o.total_amount),
      items: itemsByOrder.get(o.id) ?? [],
    }));

    return NextResponse.json({
      tableNumber,
      orders: enrichedOrders,
      recentlySettled,
    });
  } catch (err) {
    console.error("[api/orders GET] Error:", err);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
