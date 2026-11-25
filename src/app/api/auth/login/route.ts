import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { staffLoginSchema } from "@/lib/validation/auth";
import { getHomeRouteForRole } from "@/lib/auth/rbac";
import { checkRateLimit } from "@/lib/security/rate-limit";
import type { StaffRole } from "@/constants/roles";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limit = checkRateLimit(`login:${ip}`, 15, 10 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = staffLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid login payload" },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, role, is_active, name")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (staffError || !staff || !staff.is_active) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "This account is not an active SmartDine staff member." },
        { status: 403 },
      );
    }

    const role = staff.role as StaffRole;
    return NextResponse.json({
      ok: true,
      user: {
        id: data.user.id,
        name: staff.name,
        role,
      },
      redirectTo: getHomeRouteForRole(role),
    });
  } catch (err) {
    console.error("[auth/login] Unexpected error:", err);
    return NextResponse.json(
      { error: "Authentication service unavailable. Check server configuration." },
      { status: 500 },
    );
  }
}
