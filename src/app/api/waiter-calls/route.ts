import { NextResponse, type NextRequest } from "next/server";
import { getVerifiedTableSession } from "@/lib/security/table-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createWaiterCallSchema } from "@/lib/validation/waiter";
import { evaluateWaiterCallCooldown } from "@/services/waiter";
import { resolveTableByRawToken } from "@/services/customer-menu";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = createWaiterCallSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    let session = await getVerifiedTableSession();
    if (!session && parsed.data.token) {
      const resolved = await resolveTableByRawToken(parsed.data.token);
      if (resolved) {
        session = {
          tableId: resolved.id,
          restaurantId: resolved.restaurant_id,
          tableNumber: resolved.table_number,
          tokenVersion: resolved.token_version,
          exp: Math.floor(Date.now() / 1000) + 3600 * 4,
        };
      }
    }

    if (!session) {
      return NextResponse.json(
        { error: "Please scan your table QR code before calling a waiter." },
        { status: 401 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: recentCalls } = await admin
      .from("waiter_calls")
      .select("id, status, created_at")
      .eq("table_id", session.tableId)
      .order("created_at", { ascending: false })
      .limit(5);

    const openCall = (recentCalls ?? []).some((c) => c.status === "open");
    const latestCreatedAt = recentCalls?.[0]?.created_at ?? null;
    const cooldown = evaluateWaiterCallCooldown(latestCreatedAt, openCall);

    if (!cooldown.allowed) {
      return NextResponse.json(
        {
          error: cooldown.reason,
          retryAfterSeconds: cooldown.retryAfterSeconds,
        },
        { status: 429, headers: { "Retry-After": String(cooldown.retryAfterSeconds) } },
      );
    }

    const { data: created, error } = await admin
      .from("waiter_calls")
      .insert({
        restaurant_id: session.restaurantId,
        table_id: session.tableId,
        status: "open",
        note: parsed.data.note || null,
      })
      .select("*")
      .single();

    if (error || !created) {
      return NextResponse.json({ error: "Failed to notify waiter" }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        waiterCall: created,
        message: `Waiter notified for Table ${session.tableNumber}.`,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[api/waiter-calls POST] Error:", err);
    return NextResponse.json({ error: "Failed to notify waiter" }, { status: 500 });
  }
}
