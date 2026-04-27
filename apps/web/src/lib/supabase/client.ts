import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let cachedClient: ReturnType<typeof createClient> | null = null;

/**
 * Validates URL has https protocol (CodeQL-safe alternative to startsWith checks)
 * See: documentation/security/regex-security.md
 */
function hasHttpsProtocol(url: string | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getSupabaseBrowserClient() {
  if (cachedClient) return cachedClient;

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasHttpsProtocol(url)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing or invalid for browser client.",
    );
  }

  if (!anonKey || anonKey.length < 20) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or invalid for browser client.",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  cachedClient = createClient(url!, anonKey);
  return cachedClient;
}
