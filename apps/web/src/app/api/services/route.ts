import { NextResponse } from "next/server";
import { env, isConfigured } from "@/lib/env";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { isPostHogConfigured } from "@/lib/posthog/config";
import { SERVICE_DEFINITIONS, type ServiceHealthState } from "@/lib/services/registry";

export const runtime = "nodejs";

type ServiceStatusInfo = {
  state: ServiceHealthState;
  label: string;
  description: string;
  category: "critical" | "optional" | "external";
};

function getServiceState(id: string): ServiceHealthState {
  switch (id) {
    case "supabase":
      return isConfigured(env.NEXT_PUBLIC_SUPABASE_URL) &&
        isConfigured(env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
        isConfigured(env.SUPABASE_SERVICE_ROLE_KEY)
        ? "ready"
        : "missing";
    case "vercel":
      return isConfigured(process.env.VERCEL) || isConfigured(process.env.VERCEL_ENV)
        ? "ready"
        : "external";
    case "clerk":
      return isConfigured(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
        isConfigured(env.CLERK_SECRET_KEY)
        ? "ready"
        : "missing";
    case "cloudflare":
      return "defer";
    case "sentry":
      return isConfigured(env.SENTRY_DSN) || isConfigured(env.NEXT_PUBLIC_SENTRY_DSN)
        ? "ready"
        : "missing";
    case "resend":
      return isConfigured(env.RESEND_API_KEY) && isConfigured(env.RESEND_FROM_EMAIL)
        ? "ready"
        : "missing";
    case "posthog":
      return isPostHogConfigured() ? "ready" : "missing";
    case "pinecone":
      return isConfigured(env.PINECONE_API_KEY) ? "ready" : "defer";
    case "stripe":
      return isConfigured(env.STRIPE_SECRET_KEY) &&
        isConfigured(env.STRIPE_WEBHOOK_SECRET)
        ? "ready"
        : "defer";
    case "upstash":
      return isConfigured(env.UPSTASH_REDIS_REST_URL) &&
        isConfigured(env.UPSTASH_REDIS_REST_TOKEN) &&
        isConfigured(env.QSTASH_TOKEN)
        ? "ready"
        : "defer";
    case "uptimerobot":
      return "external";
    default:
      return "defer";
  }
}

export async function GET() {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const services = Object.fromEntries(
    SERVICE_DEFINITIONS.map((definition) => [
      definition.id,
      {
        state: getServiceState(definition.id),
        label: definition.label,
        description: definition.description,
        category: definition.category,
      } as ServiceStatusInfo,
    ]),
  ) as Record<string, ServiceStatusInfo>;

  const missing = Object.entries(services)
    .filter(([, service]) => service.state === "missing")
    .map(([service]) => service);

  return NextResponse.json({
    status: "ok",
    services,
    missing,
    timestamp: new Date().toISOString(),
  });
}
