import { auth } from "@clerk/nextjs/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
  const template = env.CLERK_SUPABASE_JWT_TEMPLATE?.trim() || "supabase";
  const token = await getToken({ template }).catch(() => null);

  if (!token) {
    return null;
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasHttpsProtocol(url) || !anonKey || anonKey.length < 20) {
    return null;
  }

  return createClient(url!, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}
