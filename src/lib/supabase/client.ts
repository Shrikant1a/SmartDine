import { createBrowserClient } from "@supabase/ssr";
import { getClientEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Singleton browser Supabase client using only the public anon key.
 */
export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  const env = getClientEnv();
  browserClient = createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return browserClient;
}
