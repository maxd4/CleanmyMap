import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function getSupabaseServerClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !url.startsWith("https://")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing or invalid. Check your .env.local or Vercel settings.",
    );
  }

  if (!key || key.length < 20) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing or invalid. Server-side persistence requires a valid Service Role Key.",
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
