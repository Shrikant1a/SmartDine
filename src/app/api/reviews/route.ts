import { NextResponse, type NextRequest } from "next/server";
import { getVerifiedTableSession } from "@/lib/security/table-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { submitReviewSchema } from "@/lib/validation/review";

export async function POST(request: NextRequest) {
  try {
    const session = await getVerifiedTableSession();
    if (!session) {
      return NextResponse.json(
        { error: "Table session required to submit a review." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = submitReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid review data" },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("id, restaurant_id, table_id, status")
      .eq("id", parsed.data.orderId)
      .eq("table_id", session.tableId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json(
        { error: "Order not found for your table" },
        { status: 404 },
      );
    }

    if (order.status !== "served") {
      return NextResponse.json(
        { error: "Reviews can be submitted once your order has been served." },
        { status: 400 },
      );
    }

    const { data: existingReview } = await admin
      .from("reviews")
      .select("id, allow_edit")
      .eq("order_id", order.id)
      .maybeSingle();

    if (existingReview) {
      if (!existingReview.allow_edit) {
        return NextResponse.json(
          { error: "A review has already been submitted for this order." },
          { status: 409 },
        );
      }

      const { data: updated, error: updErr } = await admin
        .from("reviews")
        .update({
          rating: parsed.data.rating,
          comment: parsed.data.comment || null,
          allow_edit: false,
        })
        .eq("id", existingReview.id)
        .select("*")
        .single();

      if (updErr || !updated) {
        return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, review: updated });
    }

    const { data: created, error: insErr } = await admin
      .from("reviews")
      .insert({
        restaurant_id: order.restaurant_id,
        order_id: order.id,
        rating: parsed.data.rating,
        comment: parsed.data.comment || null,
      })
      .select("*")
      .single();

    if (insErr || !created) {
      return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, review: created }, { status: 201 });
  } catch (err) {
    console.error("[api/reviews POST] Error:", err);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
