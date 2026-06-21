import { auth } from "@clerk/nextjs/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildClerkSupabaseAccessTokenProvider } from "@/lib/clerk-supabase-token";
import { env } from "@/lib/env";

function hasHttpsProtocol(url: string | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function getSupabaseClerkRlsClient(): Promise<SupabaseClient | null> {
  const { getToken } = await auth();
  const token = await buildClerkSupabaseAccessTokenProvider(getToken)();

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasHttpsProtocol(url) || !anonKey || anonKey.length < 20) {
    return null;
  }

  if (!token) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[Supabase RLS] Clerk session token unavailable; native Clerk/Supabase access is not ready.",
      );
    }
    return null;
  }

  return createClient(url!, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    accessToken: async () => token,
  });
}

export async function requireSupabaseClerkRlsClient(): Promise<SupabaseClient> {
  const client = await getSupabaseClerkRlsClient();

  if (!client) {
    throw new Error(
      "Clerk/Supabase JWT accessToken unavailable for a required RLS flow.",
    );
  }

  return client;
}
