import { NextResponse } from "next/server";
import { env, isConfigured } from "@/lib/env";

type CheckState = "ok" | "configured" | "missing" | "warning";

function detectClerkKeyMode(key: string | undefined): "live" | "test" | "unknown" {
  const normalized = key?.trim();
  if (!normalized || !isConfigured(normalized)) {
    return "unknown";
  }
  if (normalized.startsWith("pk_live_") || normalized.startsWith("sk_live_")) {
    return "live";
  }
  if (normalized.startsWith("pk_test_") || normalized.startsWith("sk_test_")) {
    return "test";
  }
  return "unknown";
}

export async function GET() {
  const publishableMode = detectClerkKeyMode(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const secretMode = detectClerkKeyMode(env.CLERK_SECRET_KEY);
  const clerkConfigured = isConfigured(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && isConfigured(env.CLERK_SECRET_KEY);
  const sameMode = publishableMode === secretMode || publishableMode === "unknown" || secretMode === "unknown";
  const isProduction = process.env.NODE_ENV === "production";
  const usesTestKeysInProduction = isProduction && (publishableMode === "test" || secretMode === "test");

  const checks = {
    app: "ok" as CheckState,
    supabase: (isConfigured(env.NEXT_PUBLIC_SUPABASE_URL) && isConfigured(env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? "configured" : "missing") as CheckState,
    clerk: (clerkConfigured ? "configured" : "missing") as CheckState,
    clerk_keys: (!clerkConfigured ? "missing" : !sameMode || usesTestKeysInProduction ? "warning" : "ok") as CheckState,
    sentry: (isConfigured(env.SENTRY_DSN) || isConfigured(env.NEXT_PUBLIC_SENTRY_DSN) ? "configured" : "missing") as CheckState,
  };

  const criticalChecks: CheckState[] = [checks.app, checks.supabase, checks.clerk, checks.clerk_keys];
  const status = criticalChecks.every((state) => state === "ok" || state === "configured")
    ? "ok"
    : "degraded";

  return NextResponse.json(
    {
      status,
      checks,
      diagnostics: {
        clerk_publishable_mode: publishableMode,
        clerk_secret_mode: secretMode,
        node_env: process.env.NODE_ENV ?? "unknown",
      },
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
