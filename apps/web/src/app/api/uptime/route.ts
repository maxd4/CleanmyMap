import { NextResponse } from "next/server";
import { env, isConfigured } from "@/lib/env";

export async function GET() {
  const checks = {
    app: "ok",
    supabase: isConfigured(env.NEXT_PUBLIC_SUPABASE_URL) && isConfigured(env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? "configured" : "missing",
    clerk: isConfigured(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && isConfigured(env.CLERK_SECRET_KEY) ? "configured" : "missing",
    sentry: isConfigured(env.SENTRY_DSN) || isConfigured(env.NEXT_PUBLIC_SENTRY_DSN) ? "configured" : "missing",
  };

  const status = Object.values(checks).every((state) => state === "ok" || state === "configured")
    ? "ok"
    : "degraded";

  return NextResponse.json(
    {
      status,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: status === "ok" ? 200 : 503 },
  );
}
