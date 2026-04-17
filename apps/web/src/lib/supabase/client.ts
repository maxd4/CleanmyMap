import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let cachedClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (cachedClient) return cachedClient;

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !url.startsWith("https://")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing or invalid for browser client.",
    );
  }

  if (!anonKey || anonKey.length < 20) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or invalid for browser client.",
    );
  }

  cachedClient = createClient(url, anonKey);
  return cachedClient;
}
