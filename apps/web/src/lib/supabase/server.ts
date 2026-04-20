import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Returns a Supabase client for server-side usage.
 * @param useServiceRole If true, uses the SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). Default is currently true to avoid regressions, but should be false for public routes.
 */
export function getSupabaseServerClient(useServiceRole = true) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = useServiceRole
    ? env.SUPABASE_SERVICE_ROLE_KEY
    : env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !url.startsWith("https://")) {
    console.error("CRITICAL: NEXT_PUBLIC_SUPABASE_URL is missing or invalid.");
    return createClient(
      "https://placeholder-url.supabase.co",
      "placeholder-key",
    );
  }

  if (!key || key.length < 20) {
    console.error(
      `CRITICAL: Supabase ${useServiceRole ? "service role" : "anon"} key is missing or invalid.`,
    );
    return createClient(url, "placeholder-key");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Explicit helper for administrative operations that REQUIRE bypassing RLS.
 * Identical to getSupabaseServerClient(true).
 */
export function getSupabaseAdminClient() {
  return getSupabaseServerClient(true);
}
