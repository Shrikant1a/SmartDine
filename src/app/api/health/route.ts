import { NextResponse } from "next/server";
import { getEnvDiagnostics } from "@/lib/env-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const env = getEnvDiagnostics();
  let databaseConnected = false;
  let restaurantName: string | null = null;
  let errorMessage: string | null = null;

  if (env.supabasePublicReady) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.rpc("get_public_restaurant_info");
      if (error) {
        errorMessage = error.message;
      } else {
        databaseConnected = true;
        const first = Array.isArray(data) ? data[0] : null;
        restaurantName = first?.name ?? null;
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Database connection check failed";
    }
  } else {
    errorMessage = "Supabase public environment variables are not configured yet";
  }

  const healthy = env.supabasePublicReady && databaseConnected;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      environment: env,
      database: {
        connected: databaseConnected,
        restaurantSeeded: Boolean(restaurantName),
        restaurantName,
      },
      ...(errorMessage ? { details: errorMessage } : {}),
    },
    { status: healthy ? 200 : 503 },
  );
}
