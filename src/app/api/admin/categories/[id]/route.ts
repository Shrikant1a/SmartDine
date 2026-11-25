import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { uuidSchema } from "@/lib/validation/common";
import { categoryInputSchema } from "@/lib/validation/admin";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiStaffPermission("menu:manage");
    const { id } = await context.params;
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = categoryInputSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid category data" },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined)
      updates.description = parsed.data.description || null;
    if (parsed.data.sortOrder !== undefined)
      updates.sort_order = parsed.data.sortOrder;
    if (parsed.data.isActive !== undefined) updates.is_active = parsed.data.isActive;

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("categories")
      .update(updates)
      .eq("id", parsedId.data)
      .eq("restaurant_id", session.staff.restaurant_id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, category: data });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiStaffPermission("menu:manage");
    const { id } = await context.params;
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("categories")
      .delete()
      .eq("id", parsedId.data)
      .eq("restaurant_id", session.staff.restaurant_id);

    if (error) {
      return NextResponse.json(
        { error: "Cannot delete category while menu items are assigned to it." },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
