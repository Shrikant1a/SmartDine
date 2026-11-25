import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env-server";

/**
 * Privileged Supabase Admin client using SUPABASE_SERVICE_ROLE_KEY.
 * Strictly server-only. Only invoke after explicit RBAC or signed session verification.
 */
export function createSupabaseAdminClient() {
  const env = getServerEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
