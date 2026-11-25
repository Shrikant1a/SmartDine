import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireApiStaffPermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { uuidSchema } from "@/lib/validation/common";
import { updateReviewEditFlagSchema } from "@/lib/validation/review";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiStaffPermission("settings:manage");
    const { id } = await context.params;
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid review ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = updateReviewEditFlagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid flag" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("reviews")
      .update({ allow_edit: parsed.data.allowEdit })
      .eq("id", parsedId.data)
      .eq("restaurant_id", session.staff.restaurant_id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, review: data });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}
