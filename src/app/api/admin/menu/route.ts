import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { menuItemInputSchema } from "@/lib/validation/admin";
import { getAdminMenuData } from "@/services/admin-server";

export async function GET() {
  try {
    const session = await requireApiStaffPermission("menu:manage");
    const data = await getAdminMenuData(session.staff.restaurant_id);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to load menu" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireApiStaffPermission("menu:manage");
    const body = await request.json().catch(() => null);
    const parsed = menuItemInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid menu item payload" },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: item, error } = await admin
      .from("menu_items")
      .insert({
        restaurant_id: session.staff.restaurant_id,
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
      .select("*")
      .single();

    if (error || !item) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create menu item" },
        { status: 400 },
      );
    }

    if (parsed.data.variants.length > 0) {
      await admin.from("menu_item_variants").insert(
        parsed.data.variants.map((v, idx) => ({
          menu_item_id: item.id,
          name: v.name,
          price: v.price,
          is_default: v.isDefault,
          is_available: v.isAvailable,
          sort_order: idx + 1,
        })),
      );
    }

    if (parsed.data.addons.length > 0) {
      await admin.from("menu_item_addons").insert(
        parsed.data.addons.map((a, idx) => ({
          menu_item_id: item.id,
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
      action: "menu_item.create",
      entity_type: "menu_item",
      entity_id: item.id,
      new_values: { name: item.name, base_price: item.base_price },
    });

    revalidateTag("menu-catalog", "max");
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to create menu item" }, { status: 500 });
  }
}
