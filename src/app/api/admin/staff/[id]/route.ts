import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { uuidSchema } from "@/lib/validation/common";
import { staffUpdateSchema } from "@/lib/validation/admin";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiStaffPermission("staff:manage");
    const { id } = await context.params;
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid staff ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = staffUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid staff update" },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: target, error: fetchErr } = await admin
      .from("staff")
      .select("*")
      .eq("id", parsedId.data)
      .eq("restaurant_id", session.staff.restaurant_id)
      .maybeSingle();

    if (fetchErr || !target) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Prevent owner from locking out themselves if no other active owner exists
    if (
      target.id === session.staff.id &&
      (parsed.data.isActive === false ||
        (parsed.data.role && parsed.data.role !== "owner"))
    ) {
      const { count } = await admin
        .from("staff")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", session.staff.restaurant_id)
        .eq("role", "owner")
        .eq("is_active", true);

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Cannot deactivate or demote the sole active owner." },
          { status: 400 },
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.role !== undefined) updates.role = parsed.data.role;
    if (parsed.data.isActive !== undefined) updates.is_active = parsed.data.isActive;
    if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone || null;

    const { data: updated, error: updErr } = await admin
      .from("staff")
      .update(updates)
      .eq("id", target.id)
      .select("*")
      .single();

    if (updErr || !updated) {
      return NextResponse.json({ error: "Failed to update staff member" }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      restaurant_id: session.staff.restaurant_id,
      staff_id: session.staff.id,
      actor_role: session.staff.role,
      action: "staff.update",
      entity_type: "staff",
      entity_id: target.id,
      old_values: { role: target.role, is_active: target.is_active },
      new_values: { role: updated.role, is_active: updated.is_active },
    });

    return NextResponse.json({ ok: true, staff: updated });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to update staff member" }, { status: 500 });
  }
}
