import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

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

export function getSupabaseBrowserClient(
  accessToken?: () => Promise<string | null>,
) {
  if (!accessToken && cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

  const client = accessToken
    ? createClient(url!, anonKey, { accessToken })
    : createClient(url!, anonKey);

  if (!accessToken) {
    cachedClient = client;
  }

  return client;
}
