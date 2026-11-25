import { NextResponse, type NextRequest } from "next/server";
import { getVerifiedTableSession } from "@/lib/security/table-session";
import { createOrderSchema } from "@/lib/validation/order";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { notifyNewOrderAndStock } from "@/services/notifications";

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

export async function GET() {
  try {
    const session = await getVerifiedTableSession();
    if (!session) {
      return NextResponse.json({ error: "No active table session" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("orders")
      .select("id, order_number, status, payment_mode, payment_status, total_amount, created_at")
      .eq("table_id", session.tableId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
    }

    return NextResponse.json({
      tableNumber: session.tableNumber,
      orders: data ?? [],
    });
  } catch (err) {
    console.error("[api/orders GET] Error:", err);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
