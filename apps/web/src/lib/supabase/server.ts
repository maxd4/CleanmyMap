import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Returns true if the core Supabase environment variables are present and look valid.
 */
export function isSupabaseConfigured(): boolean {
  return (
    !!env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("https://") &&
    !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 20
  );
}

/**
 * Returns a Supabase client for server-side usage.
 * @param useServiceRole If true, uses the SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
 */
export function getSupabaseServerClient(useServiceRole = true) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = useServiceRole
    ? env.SUPABASE_SERVICE_ROLE_KEY
    : env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isProd = process.env.NODE_ENV === "production";
  const failFastClient = (reason: string) =>
    createClient("https://invalid.supabase.local", "invalid-key-for-dev", {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: async () => {
          throw new Error(reason);
        },
      },
    });

  if (!url || !url.startsWith("https://")) {
    const errorMsg = "CRITICAL: NEXT_PUBLIC_SUPABASE_URL is missing or invalid.";
    if (isProd) throw new Error(errorMsg);

    console.warn(`[Supabase Dev Fallback] ${errorMsg}`);
    return failFastClient(errorMsg);
  }

  if (!key || key.length < 20) {
    const errorMsg = `CRITICAL: Supabase ${useServiceRole ? "service role" : "anon"} key is missing or invalid.`;
    if (isProd) throw new Error(errorMsg);

    console.warn(`[Supabase Dev Fallback] ${errorMsg}`);
    return failFastClient(errorMsg);
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
