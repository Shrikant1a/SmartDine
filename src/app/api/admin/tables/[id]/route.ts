import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { uuidSchema } from "@/lib/validation/common";
import { tableUpdateSchema } from "@/lib/validation/admin";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiStaffPermission("tables:manage");
    const { id } = await context.params;
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid table ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = tableUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid table update" },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.tableNumber !== undefined)
      updates.table_number = parsed.data.tableNumber;
    if (parsed.data.label !== undefined) updates.label = parsed.data.label || null;
    if (parsed.data.capacity !== undefined) updates.capacity = parsed.data.capacity;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.isActive !== undefined) updates.is_active = parsed.data.isActive;

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("restaurant_tables")
      .update(updates)
      .eq("id", parsedId.data)
      .eq("restaurant_id", session.staff.restaurant_id)
      .select(
        "id, restaurant_id, table_number, label, capacity, token_version, status, assigned_waiter_id, is_active, created_at, updated_at",
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Table not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, table: data });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to update table" }, { status: 500 });
  }
}

export async function DELETE(
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
    const { error } = await admin
      .from("restaurant_tables")
      .update({ is_active: false, status: "inactive" })
      .eq("id", parsedId.data)
      .eq("restaurant_id", session.staff.restaurant_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to deactivate table" }, { status: 500 });
  }
}
