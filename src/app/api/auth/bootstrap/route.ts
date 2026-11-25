import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ownerBootstrapSchema } from "@/lib/validation/auth";
import { getServerEnv } from "@/lib/env-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rate-limit";

function timingSafeMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Controlled one-time Owner bootstrap endpoint.
 * Permanently disables itself once an active 'owner' exists in public.staff.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limit = checkRateLimit(`bootstrap:${ip}`, 5, 15 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many bootstrap attempts. Try again later." },
        { status: 429 },
      );
    }

    const env = getServerEnv();
    if (!env.OWNER_BOOTSTRAP_SECRET) {
      return NextResponse.json(
        { error: "Owner bootstrap is disabled (OWNER_BOOTSTRAP_SECRET is not set)." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = ownerBootstrapSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid bootstrap input" },
        { status: 400 },
      );
    }

    if (!timingSafeMatch(parsed.data.bootstrapSecret, env.OWNER_BOOTSTRAP_SECRET)) {
      return NextResponse.json(
        { error: "Invalid bootstrap setup secret." },
        { status: 403 },
      );
    }

    const admin = createSupabaseAdminClient();

    // Check if an active owner already exists
    const { count: ownerCount, error: countError } = await admin
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("role", "owner")
      .eq("is_active", true);

    if (countError) {
      return NextResponse.json({ error: "Database check failed." }, { status: 500 });
    }

    if ((ownerCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "Owner account is already provisioned. Bootstrap is locked." },
        { status: 409 },
      );
    }

    // Ensure a restaurant row exists
    const { data: existingRestaurant } = await admin
      .from("restaurants")
      .select("id, name")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let restaurantId = existingRestaurant?.id as string | undefined;

    if (!restaurantId) {
      const { data: createdRestaurant, error: restError } = await admin
        .from("restaurants")
        .insert({
          name: parsed.data.restaurantName || "SmartDine Bistro",
          slug: "smartdine-bistro",
        })
        .select("id")
        .single();

      if (restError || !createdRestaurant) {
        return NextResponse.json(
          { error: "Failed to initialize restaurant record." },
          { status: 500 },
        );
      }
      restaurantId = createdRestaurant.id;
    } else if (parsed.data.restaurantName) {
      await admin
        .from("restaurants")
        .update({ name: parsed.data.restaurantName })
        .eq("id", restaurantId);
    }

    // Create Supabase Auth user with email confirmed
    const { data: createdUser, error: authError } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        name: parsed.data.name,
        role: "owner",
      },
    });

    if (authError || !createdUser.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Failed to create owner auth account." },
        { status: 400 },
      );
    }

    const { data: staffRow, error: staffInsertError } = await admin
      .from("staff")
      .insert({
        user_id: createdUser.user.id,
        restaurant_id: restaurantId,
        name: parsed.data.name,
        email: parsed.data.email,
        role: "owner",
        is_active: true,
      })
      .select("id")
      .single();

    if (staffInsertError || !staffRow) {
      await admin.auth.admin.deleteUser(createdUser.user.id);
      return NextResponse.json(
        { error: "Failed to assign owner staff record." },
        { status: 500 },
      );
    }

    await admin.from("audit_logs").insert({
      restaurant_id: restaurantId,
      staff_id: staffRow.id,
      actor_role: "owner",
      action: "owner.bootstrap",
      entity_type: "staff",
      entity_id: staffRow.id,
      new_values: { email: parsed.data.email, role: "owner" },
      ip_address: ip,
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Owner account created successfully. You can now sign in at /login.",
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[auth/bootstrap] Unexpected error:", err);
    return NextResponse.json(
      { error: "Owner bootstrap failed. Verify environment variables and migrations." },
      { status: 500 },
    );
  }
}
