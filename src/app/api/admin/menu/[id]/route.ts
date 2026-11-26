import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { uuidSchema } from "@/lib/validation/common";
import {
  menuItemInputSchema,
  toggleAvailabilitySchema,
} from "@/lib/validation/admin";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiStaffPermission("menu:manage");
    const { id } = await context.params;
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid menu item ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const admin = createSupabaseAdminClient();

    const { data: existing, error: fetchErr } = await admin
      .from("menu_items")
      .select("*")
      .eq("id", parsedId.data)
      .eq("restaurant_id", session.staff.restaurant_id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    // Quick Sold Out / Available toggle path
    if (body && typeof body === "object" && Object.keys(body).length === 1 && "isAvailable" in body) {
      const parsedToggle = toggleAvailabilitySchema.safeParse(body);
      if (!parsedToggle.success) {
        return NextResponse.json({ error: "Invalid availability flag" }, { status: 400 });
      }

      const { data: updated, error: updErr } = await admin
        .from("menu_items")
        .update({ is_available: parsedToggle.data.isAvailable })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      await admin.from("audit_logs").insert({
        restaurant_id: session.staff.restaurant_id,
        staff_id: session.staff.id,
        actor_role: session.staff.role,
        action: "menu_item.availability",
        entity_type: "menu_item",
        entity_id: existing.id,
        old_values: { is_available: existing.is_available },
        new_values: { is_available: parsedToggle.data.isAvailable },
      });

      revalidateTag("menu-catalog", "max");
      return NextResponse.json({ ok: true, item: updated });
    }

    const parsed = menuItemInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid menu item update" },
        { status: 400 },
      );
    }

    const { data: updated, error: updErr } = await admin
      .from("menu_items")
      .update({
        category_id: parsed.data.categoryId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        image_url: parsed.data.imageUrl || null,
        base_price: parsed.data.basePrice,
        gst_percent: parsed.data.gstPercent,
        is_veg: parsed.data.isVeg,
        is_recommended: parsed.data.isRecommended,
        is_popular: parsed.data.isPopular,
        is_available: parsed.data.isAvailable,
        stock_qty: parsed.data.stockQty ?? null,
        low_stock_threshold: parsed.data.lowStockThreshold,
        prep_time_mins: parsed.data.prepTimeMins,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (updErr || !updated) {
      return NextResponse.json(
        { error: updErr?.message ?? "Failed to update menu item" },
        { status: 400 },
      );
    }

    // Replace variants & add-ons cleanly
    await admin.from("menu_item_variants").delete().eq("menu_item_id", existing.id);
    if (parsed.data.variants.length > 0) {
      await admin.from("menu_item_variants").insert(
        parsed.data.variants.map((v, idx) => ({
          menu_item_id: existing.id,
          name: v.name,
          price: v.price,
          is_default: v.isDefault,
          is_available: v.isAvailable,
          sort_order: idx + 1,
        })),
      );
    }

    await admin.from("menu_item_addons").delete().eq("menu_item_id", existing.id);
    if (parsed.data.addons.length > 0) {
      await admin.from("menu_item_addons").insert(
        parsed.data.addons.map((a, idx) => ({
          menu_item_id: existing.id,
          name: a.name,
          price: a.price,
          is_available: a.isAvailable,
          sort_order: idx + 1,
        })),
      );
    }

    await admin.from("audit_logs").insert({
      restaurant_id: session.staff.restaurant_id,
      staff_id: session.staff.id,
      actor_role: session.staff.role,
      action: "menu_item.update",
      entity_type: "menu_item",
      entity_id: existing.id,
      old_values: { name: existing.name, base_price: existing.base_price },
      new_values: { name: updated.name, base_price: updated.base_price },
    });

    revalidateTag("menu-catalog", "max");
    return NextResponse.json({ ok: true, item: updated });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to update menu item" }, { status: 500 });
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
      return NextResponse.json({ error: "Invalid menu item ID" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("menu_items")
      .update({ is_archived: true, is_available: false })
      .eq("id", parsedId.data)
      .eq("restaurant_id", session.staff.restaurant_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      restaurant_id: session.staff.restaurant_id,
      staff_id: session.staff.id,
      actor_role: session.staff.role,
      action: "menu_item.archive",
      entity_type: "menu_item",
      entity_id: parsedId.data,
    });

    revalidateTag("menu-catalog", "max");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to archive menu item" }, { status: 500 });
  }
}
