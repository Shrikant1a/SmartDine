import { NextResponse } from "next/server";
import { getVerifiedTableSession } from "@/lib/security/table-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const session = await getVerifiedTableSession();
    if (!session) {
      return NextResponse.json(
        { error: "Scan a valid table QR code to view restaurant Wi-Fi." },
        { status: 401 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("restaurants")
      .select("wifi_ssid, wifi_password")
      .eq("id", session.restaurantId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: "Wi-Fi details unavailable." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ssid: data.wifi_ssid,
      password: data.wifi_password,
    });
  } catch (err) {
    console.error("[api/table/wifi] Error:", err);
    return NextResponse.json(
      { error: "Unable to load Wi-Fi details." },
      { status: 500 },
    );
  }
}
