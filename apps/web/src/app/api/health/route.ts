import { NextResponse } from "next/server";
import { env, isConfigured } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function requiredConfigFlags() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: isConfigured(env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: isConfigured(
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    SUPABASE_SERVICE_ROLE_KEY: isConfigured(env.SUPABASE_SERVICE_ROLE_KEY),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: isConfigured(
      env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    ),
    CLERK_SECRET_KEY: isConfigured(env.CLERK_SECRET_KEY),
  };
}

export async function GET() {
  const config = requiredConfigFlags();
  const missingConfigKeys = Object.entries(config)
    .filter(([, ok]) => !ok)
    .map(([key]) => key);

  let supabaseConnectivity = false;
  let supabaseError: string | null = null;

  if (
    missingConfigKeys.includes("NEXT_PUBLIC_SUPABASE_URL") ||
    missingConfigKeys.includes("SUPABASE_SERVICE_ROLE_KEY")
  ) {
    supabaseError = "Supabase server config missing";
  } else {
    try {
      const supabase = getSupabaseServerClient(false);
      const result = await supabase
        .from("actions")
        .select("id", { count: "exact", head: true })
        .limit(1);
      if (result.error) {
        supabaseError = result.error.message;
      } else {
        supabaseConnectivity = true;
      }
    } catch (error) {
      supabaseError =
        error instanceof Error ? error.message : "Unknown Supabase error";
    }
  }

  const ok = missingConfigKeys.length === 0 && supabaseConnectivity;
  const payload = {
    ok,
    status: ok ? "ok" : "degraded",
    service: "cleanmymap",
    checks: {
      requiredConfigPresent: missingConfigKeys.length === 0,
      supabaseConnectivity,
    },
    missingConfigKeys,
    errors: supabaseError ? { supabase: supabaseError } : {},
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(payload, { status: ok ? 200 : 503 });
}
