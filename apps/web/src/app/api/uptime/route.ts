import { NextResponse } from"next/server";
import { env, isConfigured } from"@/lib/env";

type CheckState ="ok" |"configured" |"missing" |"warning";

const UPTIME_CACHE_HEADERS = {
 "Cache-Control": "public, max-age=0, s-maxage=120, stale-while-revalidate=300",
};

function detectClerkKeyMode(
 key: string | undefined,
):"live" |"test" |"unknown" {
 const normalized = key?.trim();
 if (!normalized || !isConfigured(normalized)) {
 return"unknown";
 }
 if (normalized.startsWith("pk_live_") || normalized.startsWith("sk_live_")) {
 return"live";
 }
 if (normalized.startsWith("pk_test_") || normalized.startsWith("sk_test_")) {
 return"test";
 }
 return"unknown";
}

export async function GET() {
 const publishableMode = detectClerkKeyMode(
 env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
 );
 const secretMode = detectClerkKeyMode(env.CLERK_SECRET_KEY);
 const clerkConfigured =
 isConfigured(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
 isConfigured(env.CLERK_SECRET_KEY);
 const sameMode =
 publishableMode === secretMode ||
 publishableMode ==="unknown" ||
 secretMode ==="unknown";
 const isProduction = process.env.NODE_ENV ==="production";
 const usesTestKeysInProduction =
 isProduction && (publishableMode ==="test" || secretMode ==="test");

 const criticalChecks = {
 app:"ok" as CheckState,
 supabase: (isConfigured(env.NEXT_PUBLIC_SUPABASE_URL) &&
 isConfigured(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
 ?"configured"
 :"missing") as CheckState,
 clerk: (clerkConfigured ?"configured" :"missing") as CheckState,
 clerkKeyConsistency: (!clerkConfigured
 ?"missing"
 : !sameMode || usesTestKeysInProduction
 ?"warning"
 :"ok") as CheckState,
 };

 const optionalChecks = {
 sentry: (isConfigured(env.SENTRY_DSN) ||
 isConfigured(env.NEXT_PUBLIC_SENTRY_DSN)
 ?"configured"
 :"missing") as CheckState,
 };

 const criticalStates: CheckState[] = Object.values(criticalChecks);
 const optionalStates: CheckState[] = Object.values(optionalChecks);
 const criticalStatus = criticalStates.every(
 (state) => state ==="ok" || state ==="configured",
 )
 ?"ok"
 :"degraded";
 const optionalStatus = optionalStates.every(
 (state) => state ==="ok" || state ==="configured",
 )
 ?"ok"
 :"warning";

 const criticalConfiguredCount = criticalStates.filter(
  (state) => state ==="ok" || state ==="configured",
 ).length;
 const criticalAlertCount = criticalStates.length - criticalConfiguredCount;
 const optionalConfiguredCount = optionalStates.filter(
  (state) => state ==="ok" || state ==="configured",
 ).length;
 const optionalAlertCount = optionalStates.length - optionalConfiguredCount;

 return NextResponse.json(
 {
  status: criticalStatus,
 criticalStatus,
 optionalStatus,
  criticalConfiguredCount,
  criticalAlertCount,
  optionalConfiguredCount,
  optionalAlertCount,
  timestamp: new Date().toISOString(),
 },
 { status: 200, headers: UPTIME_CACHE_HEADERS },
 );
}
