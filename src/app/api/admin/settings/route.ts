import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { restaurantSettingsSchema } from "@/lib/validation/admin";
import { getAdminRestaurantSettings } from "@/services/admin-server";

export async function GET() {
  try {
    const session = await requireApiStaffPermission("settings:view");
    const restaurant = await getAdminRestaurantSettings(session.staff.restaurant_id);
    return NextResponse.json({ restaurant });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireApiStaffPermission("settings:manage");
    const body = await request.json().catch(() => null);
    const parsed = restaurantSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid settings payload" },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: updated, error } = await admin
      .from("restaurants")
      .update({
        name: parsed.data.name,
        description: parsed.data.description || null,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
        logo_url: parsed.data.logoUrl || null,
        gst_number: parsed.data.gstNumber || null,
        default_gst_percent: parsed.data.defaultGstPercent,
        service_charge_percent: parsed.data.serviceChargePercent,
        wifi_ssid: parsed.data.wifiSsid || null,
        wifi_password: parsed.data.wifiPassword || null,
        google_review_url: parsed.data.googleReviewUrl || null,
        owner_whatsapp: parsed.data.ownerWhatsapp || null,
        kitchen_whatsapp: parsed.data.kitchenWhatsapp || null,
        is_open: parsed.data.isOpen,
      })
      .eq("id", session.staff.restaurant_id)
      .select("*")
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      restaurant_id: session.staff.restaurant_id,
      staff_id: session.staff.id,
      actor_role: session.staff.role,
      action: "restaurant.settings.update",
      entity_type: "restaurant",
      entity_id: updated.id,
      new_values: {
        name: updated.name,
        is_open: updated.is_open,
        default_gst_percent: updated.default_gst_percent,
      },
    });

    return NextResponse.json({ ok: true, restaurant: updated });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
