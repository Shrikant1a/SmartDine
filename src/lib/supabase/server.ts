import "server-only";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getClientEnv } from "@/lib/env";

/**
 * Cookie-backed Supabase server client for Server Components, Server Actions, and Route Handlers.
 * Respects Row Level Security for the authenticated user (or anon when unauthenticated).
 */
export async function createSupabaseServerClient() {
  // Opt out of static prerendering in Server Component shells with Suspense
  try {
    await connection();
  } catch {
    // Route Handlers and non-Suspense scopes safely proceed
  }
  const cookieStore = await cookies();
  const env = getClientEnv();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Setting cookies inside a Server Component is ignored; proxy.ts handles refresh.
          }
        },
      },
    },
  );
}
