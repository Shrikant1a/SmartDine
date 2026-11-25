import { NextResponse, type NextRequest } from "next/server";
import { resolveTableSchema } from "@/lib/validation/order";
import { resolveTableByRawToken } from "@/services/customer-menu";
import { getServerEnv } from "@/lib/env-server";
import {
  signTableSession,
  TABLE_SESSION_COOKIE_NAME,
} from "@/lib/security/qr";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limit = checkRateLimit(`table-resolve:${ip}`, 30, 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = resolveTableSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid QR token" }, { status: 400 });
    }

    const table = await resolveTableByRawToken(parsed.data.token);
    if (!table) {
      return NextResponse.json(
        { error: "This table QR code is invalid, inactive, or has been revoked." },
        { status: 404 },
      );
    }

    const env = getServerEnv();
    const signedCookie = signTableSession(
      {
        tableId: table.id,
        restaurantId: table.restaurant_id,
        tableNumber: table.table_number,
        tokenVersion: table.token_version,
      },
      env.TABLE_SESSION_SECRET,
    );

    const response = NextResponse.json({
      ok: true,
      table: {
        id: table.id,
        restaurantId: table.restaurant_id,
        tableNumber: table.table_number,
        label: table.label,
      },
    });

    response.cookies.set(TABLE_SESSION_COOKIE_NAME, signedCookie, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 6,
    });

    return response;
  } catch (err) {
    console.error("[api/table/resolve] Error:", err);
    return NextResponse.json(
      { error: "Could not verify table QR code." },
      { status: 500 },
    );
  }
}
