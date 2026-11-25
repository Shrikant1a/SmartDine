import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { categoryInputSchema } from "@/lib/validation/admin";

export async function GET() {
  try {
    const session = await requireApiStaffPermission("menu:manage");
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("categories")
      .select("*")
      .eq("restaurant_id", session.staff.restaurant_id)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ categories: data ?? [] });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireApiStaffPermission("menu:manage");
    const body = await request.json().catch(() => null);
    const parsed = categoryInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid category data" },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("categories")
      .insert({
        restaurant_id: session.staff.restaurant_id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        sort_order: parsed.data.sortOrder,
        is_active: parsed.data.isActive,
      })
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create category" },
        { status: 400 },
      );
    }

    await admin.from("audit_logs").insert({
      restaurant_id: session.staff.restaurant_id,
      staff_id: session.staff.id,
      actor_role: session.staff.role,
      action: "category.create",
      entity_type: "category",
      entity_id: data.id,
      new_values: { name: data.name },
    });

    return NextResponse.json({ ok: true, category: data }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
