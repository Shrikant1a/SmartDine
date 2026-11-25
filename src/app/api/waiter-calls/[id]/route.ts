import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { uuidSchema } from "@/lib/validation/common";
import { updateWaiterCallSchema } from "@/lib/validation/waiter";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiStaffPermission("waiter_calls:resolve");
    const { id } = await context.params;
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid waiter call ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = updateWaiterCallSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid waiter call status" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const nowIso = new Date().toISOString();
    const updates: Record<string, unknown> = { status: parsed.data.status };

    if (parsed.data.status === "acknowledged") {
      updates.acknowledged_by = session.staff.id;
      updates.acknowledged_at = nowIso;
    } else if (parsed.data.status === "resolved") {
      updates.resolved_by = session.staff.id;
      updates.resolved_at = nowIso;
    }

    const { data, error } = await admin
      .from("waiter_calls")
      .update(updates)
      .eq("id", parsedId.data)
      .eq("restaurant_id", session.staff.restaurant_id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Waiter call not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, waiterCall: data });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to update waiter call" }, { status: 500 });
  }
}
