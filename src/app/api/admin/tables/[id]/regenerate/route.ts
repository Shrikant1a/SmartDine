import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env-server";
import { generateRawQrToken, hashQrToken } from "@/lib/security/qr";
import { uuidSchema } from "@/lib/validation/common";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiStaffPermission("tables:manage");
    const { id } = await context.params;
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid table ID" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: existing, error: fetchErr } = await admin
      .from("restaurant_tables")
      .select("id, table_number, token_version")
      .eq("id", parsedId.data)
      .eq("restaurant_id", session.staff.restaurant_id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const env = getServerEnv();
    const rawToken = generateRawQrToken();
    const qrTokenHash = hashQrToken(rawToken, env.QR_TOKEN_SECRET);
    const nextVersion = (existing.token_version ?? 1) + 1;

    const { data: updated, error: updErr } = await admin
      .from("restaurant_tables")
      .update({
        qr_token_hash: qrTokenHash,
        token_version: nextVersion,
        is_active: true,
      })
      .eq("id", existing.id)
      .select(
        "id, restaurant_id, table_number, label, capacity, token_version, status, assigned_waiter_id, is_active, created_at, updated_at",
      )
      .single();

    if (updErr || !updated) {
      return NextResponse.json({ error: "Failed to regenerate QR token" }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      restaurant_id: session.staff.restaurant_id,
      staff_id: session.staff.id,
      actor_role: session.staff.role,
      action: "table.qr_regenerate",
      entity_type: "restaurant_table",
      entity_id: existing.id,
      new_values: { token_version: nextVersion },
    });

    return NextResponse.json({
      ok: true,
      table: updated,
      qrPath: `/menu/${rawToken}`,
    });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to regenerate QR token" }, { status: 500 });
  }
}
