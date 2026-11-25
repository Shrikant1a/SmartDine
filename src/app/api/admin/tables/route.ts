import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env-server";
import { generateRawQrToken, hashQrToken } from "@/lib/security/qr";
import { tableCreateSchema } from "@/lib/validation/admin";
import { getAdminTablesData } from "@/services/admin-server";

export async function GET() {
  try {
    const session = await requireApiStaffPermission("tables:manage");
    const tables = await getAdminTablesData(session.staff.restaurant_id);
    return NextResponse.json({ tables });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to load tables" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireApiStaffPermission("tables:manage");
    const body = await request.json().catch(() => null);
    const parsed = tableCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid table payload" },
        { status: 400 },
      );
    }

    const env = getServerEnv();
    const rawToken = generateRawQrToken();
    const qrTokenHash = hashQrToken(rawToken, env.QR_TOKEN_SECRET);

    const admin = createSupabaseAdminClient();
    const { data: table, error } = await admin
      .from("restaurant_tables")
      .insert({
        restaurant_id: session.staff.restaurant_id,
        table_number: parsed.data.tableNumber,
        label: parsed.data.label || null,
        capacity: parsed.data.capacity,
        qr_token_hash: qrTokenHash,
        token_version: 1,
        is_active: true,
      })
      .select(
        "id, restaurant_id, table_number, label, capacity, token_version, status, assigned_waiter_id, is_active, created_at, updated_at",
      )
      .single();

    if (error || !table) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create table" },
        { status: 400 },
      );
    }

    await admin.from("audit_logs").insert({
      restaurant_id: session.staff.restaurant_id,
      staff_id: session.staff.id,
      actor_role: session.staff.role,
      action: "table.create",
      entity_type: "restaurant_table",
      entity_id: table.id,
      new_values: { table_number: table.table_number },
    });

    return NextResponse.json(
      {
        ok: true,
        table,
        qrPath: `/menu/${rawToken}`,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to create table" }, { status: 500 });
  }
}
