import { NextResponse } from"next/server";
import { env, isConfigured } from"@/lib/env";
import { requireAdminAccess } from"@/lib/authz";
import { adminAccessErrorJsonResponse } from"@/lib/http/auth-responses";
import { resolveContactEmail, resolveEmailFrom } from "@/lib/email-config";
import { isPostHogConfigured } from"@/lib/posthog/config";
import { getRateLimitObservability } from "@/lib/rate-limit/observability";
import { SERVICE_DEFINITIONS, type ServiceHealthState } from"@/lib/services/registry";
import {
 buildServiceHealthSummary,
 buildServiceIncidentTimeline,
 enrichServiceStatuses,
} from"@/lib/services/health";

export const runtime ="nodejs";
// Justification no-store: cet état d'administration reflète l'environnement
// et l'observabilité courants ; il ne doit pas être partagé ni rester périmé.
const SERVICE_STATUS_CACHE_HEADERS = {
 "Cache-Control": "private, no-store",
};

const SERVICE_STATE_RESOLVERS: Record<string, () => ServiceHealthState> = {
 supabase: () => isConfigured(env.NEXT_PUBLIC_SUPABASE_URL) && isConfigured(env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && isConfigured(env.SUPABASE_SERVICE_ROLE_KEY) ? "ready" : "missing",
 vercel: () => isConfigured(process.env["VERCEL"]) || isConfigured(process.env["VERCEL_ENV"]) ? "ready" : "external",
 clerk: () => isConfigured(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && isConfigured(env.CLERK_SECRET_KEY) ? "ready" : "missing",
 cloudflare: () => isConfigured(env.CLOUDFLARE_API_TOKEN) ? "ready" : "external",
 sentry: () => isConfigured(env.SENTRY_DSN) || isConfigured(env.NEXT_PUBLIC_SENTRY_DSN) ? "ready" : "missing",
 resend: () => isConfigured(env.RESEND_API_KEY) && isConfigured(resolveEmailFrom()) && isConfigured(resolveContactEmail()) ? "ready" : "missing",
 posthog: () => isPostHogConfigured() ? "ready" : "missing",
 pinecone: () => isConfigured(env.PINECONE_API_KEY) ? "ready" : "defer",
 stripe: () => isConfigured(env.STRIPE_SECRET_KEY) && isConfigured(env.STRIPE_WEBHOOK_SECRET) ? "ready" : "defer",
 upstash: () => isConfigured(env.UPSTASH_REDIS_REST_URL) && isConfigured(env.UPSTASH_REDIS_REST_TOKEN) ? "ready" : "defer",
 qstash: () => isConfigured(env.QSTASH_TOKEN) ? "ready" : "defer",
 uptimerobot: () => isConfigured(env.UPTIMEROBOT_API_KEY) ? "ready" : "external",
};

function getServiceState(id: string): ServiceHealthState {
 return SERVICE_STATE_RESOLVERS[id]?.() ?? "defer";
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
 const observability = { rateLimit: getRateLimitObservability() };

 return NextResponse.json({
 status: summary.globalState === "ok" ? "ok" : "degraded",
 services,
 missing,
 summary,
 timeline,
 observability,
 timestamp: generatedAt,
 }, { headers: SERVICE_STATUS_CACHE_HEADERS });
}
