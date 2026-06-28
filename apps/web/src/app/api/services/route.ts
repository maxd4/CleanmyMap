import { NextResponse } from"next/server";
import { env, isConfigured } from"@/lib/env";
import { requireAdminAccess } from"@/lib/authz";
import { adminAccessErrorJsonResponse } from"@/lib/http/auth-responses";
import { resolveContactEmail, resolveEmailFrom } from "@/lib/email-config";
import { isPostHogConfigured } from"@/lib/posthog/config";
import { SERVICE_DEFINITIONS, type ServiceHealthState } from"@/lib/services/registry";
import {
 buildServiceHealthSummary,
 buildServiceIncidentTimeline,
 enrichServiceStatuses,
} from"@/lib/services/health";

export const runtime ="nodejs";
const SERVICE_STATUS_CACHE_HEADERS = {
 "Cache-Control": "private, max-age=300, stale-while-revalidate=3600",
};

function getServiceState(id: string): ServiceHealthState {
 switch (id) {
 case"supabase":
 return isConfigured(env.NEXT_PUBLIC_SUPABASE_URL) &&
 isConfigured(env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
 isConfigured(env.SUPABASE_SERVICE_ROLE_KEY)
 ?"ready"
 :"missing";
 case"vercel":
 return isConfigured(process.env["VERCEL"]) || isConfigured(process.env["VERCEL_ENV"])
 ?"ready"
 :"external";
 case"clerk":
 return isConfigured(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
 isConfigured(env.CLERK_SECRET_KEY)
 ?"ready"
 :"missing";
 case"cloudflare":
 return isConfigured(env.CLOUDFLARE_API_TOKEN) ?"ready" :"external";
 case"sentry":
 return isConfigured(env.SENTRY_DSN) || isConfigured(env.NEXT_PUBLIC_SENTRY_DSN)
 ?"ready"
 :"missing";
 case"resend":
 return isConfigured(env.RESEND_API_KEY) &&
 isConfigured(resolveEmailFrom()) &&
 isConfigured(resolveContactEmail())
 ?"ready"
 :"missing";
 case"posthog":
 return isPostHogConfigured() ?"ready" :"missing";
 case"pinecone":
 return isConfigured(env.PINECONE_API_KEY) ?"ready" :"defer";
 case"stripe":
 return isConfigured(env.STRIPE_SECRET_KEY) &&
 isConfigured(env.STRIPE_WEBHOOK_SECRET)
 ?"ready"
 :"defer";
 case"upstash":
 return isConfigured(env.UPSTASH_REDIS_REST_URL) &&
 isConfigured(env.UPSTASH_REDIS_REST_TOKEN) &&
 isConfigured(env.QSTASH_TOKEN)
 ?"ready"
 :"defer";
 case"uptimerobot":
 return isConfigured(env.UPTIMEROBOT_API_KEY) ?"ready" :"external";
 default:
 return"defer";
 }
}

export async function GET() {
 const access = await requireAdminAccess();
 if (!access.ok) {
 return adminAccessErrorJsonResponse(access);
 }

 const generatedAt = new Date().toISOString();
 const services = enrichServiceStatuses(SERVICE_DEFINITIONS, getServiceState);

 const missing = Object.entries(services)
 .filter(([, service]) => service.state ==="missing" || service.state ==="defer")
 .map(([service]) => service);
 const summary = buildServiceHealthSummary(services, generatedAt);
 const timeline = buildServiceIncidentTimeline(services, generatedAt);

 return NextResponse.json({
 status: summary.globalState === "ok" ? "ok" : "degraded",
 services,
 missing,
 summary,
 timeline,
 timestamp: generatedAt,
 }, { headers: SERVICE_STATUS_CACHE_HEADERS });
}
