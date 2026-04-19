import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function getSupabaseServerClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !url.startsWith("https://")) {
    console.error("CRITICAL: NEXT_PUBLIC_SUPABASE_URL is missing or invalid.");
    // We return a dummy client that will fail on calls but not crash the whole server component during init
    return createClient("https://placeholder-url.supabase.co", "placeholder-key");
  }

  if (!key || key.length < 20) {
    console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing or invalid.");
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
