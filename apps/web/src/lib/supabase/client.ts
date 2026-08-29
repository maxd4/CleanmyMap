import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

/**
 * Production Supabase URLs must use HTTPS. The official local CLI exposes
 * localhost over HTTP, which is accepted only for non-production local runs.
 */
function hasAllowedProtocol(url: string | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") return true;
    return (
      process.env.NODE_ENV !== "production" &&
      parsed.protocol === "http:" &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

export function getSupabaseBrowserClient(
  accessToken?: () => Promise<string | null>,
) {
  if (!accessToken && cachedClient) return cachedClient;

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (!hasAllowedProtocol(url)) {
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
