import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let cachedClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (cachedClient) return cachedClient;

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase browser client is not configured");
  }

  cachedClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return cachedClient;
}
