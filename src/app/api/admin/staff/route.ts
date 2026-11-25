import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createStaffSchema } from "@/lib/validation/auth";
import { getAdminStaffData } from "@/services/admin-server";

export async function GET() {
  try {
    const session = await requireApiStaffPermission("staff:view");
    const data = await getAdminStaffData(session.staff.restaurant_id);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to load staff" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireApiStaffPermission("staff:manage");
    const body = await request.json().catch(() => null);
    const parsed = createStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid staff input" },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: createdUser, error: authErr } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        name: parsed.data.name,
        role: parsed.data.role,
      },
    });

    if (authErr || !createdUser.user) {
      return NextResponse.json(
        { error: authErr?.message ?? "Could not create staff auth user" },
        { status: 400 },
      );
    }

    const { data: staffRow, error: staffErr } = await admin
      .from("staff")
      .insert({
        user_id: createdUser.user.id,
        restaurant_id: session.staff.restaurant_id,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        role: parsed.data.role,
        is_active: true,
      })
      .select("*")
      .single();

    if (staffErr || !staffRow) {
      await admin.auth.admin.deleteUser(createdUser.user.id);
      return NextResponse.json(
        { error: staffErr?.message ?? "Could not create staff profile" },
        { status: 400 },
      );
    }

    await admin.from("audit_logs").insert({
      restaurant_id: session.staff.restaurant_id,
      staff_id: session.staff.id,
      actor_role: session.staff.role,
      action: "staff.create",
      entity_type: "staff",
      entity_id: staffRow.id,
      new_values: { email: staffRow.email, role: staffRow.role },
    });

    return NextResponse.json({ ok: true, staff: staffRow }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to add staff member" }, { status: 500 });
  }
}
