import { NextResponse } from "next/server";
import { env, isConfigured } from "@/lib/env";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";

type ServiceState = "ready" | "missing" | "defer" | "external";

export async function GET() {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const services: Record<string, ServiceState> = {
    supabase:
      isConfigured(env.NEXT_PUBLIC_SUPABASE_URL) &&
      isConfigured(env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
      isConfigured(env.SUPABASE_SERVICE_ROLE_KEY)
        ? "ready"
        : "missing",
    vercel:
      isConfigured(process.env.VERCEL) || isConfigured(process.env.VERCEL_ENV)
        ? "ready"
        : "external",
    clerk:
      isConfigured(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
      isConfigured(env.CLERK_SECRET_KEY)
        ? "ready"
        : "missing",
    cloudflare: "defer",
    sentry:
      isConfigured(env.SENTRY_DSN) || isConfigured(env.NEXT_PUBLIC_SENTRY_DSN)
        ? "ready"
        : "missing",
    resend:
      isConfigured(env.RESEND_API_KEY) && isConfigured(env.RESEND_FROM_EMAIL)
        ? "ready"
        : "missing",
    posthog: isConfigured(env.NEXT_PUBLIC_POSTHOG_KEY) ? "ready" : "missing",
    pinecone: isConfigured(env.PINECONE_API_KEY) ? "ready" : "defer",
    stripe:
      isConfigured(env.STRIPE_SECRET_KEY) &&
      isConfigured(env.STRIPE_WEBHOOK_SECRET)
        ? "ready"
        : "defer",
    upstash:
      isConfigured(env.UPSTASH_REDIS_REST_URL) &&
      isConfigured(env.UPSTASH_REDIS_REST_TOKEN) &&
      isConfigured(env.QSTASH_TOKEN)
        ? "ready"
        : "defer",
    uptimerobot: "external",
  };

  const missing = Object.entries(services)
    .filter(([, state]) => state === "missing")
    .map(([service]) => service);

  return NextResponse.json({
    status: "ok",
    services,
    missing,
    timestamp: new Date().toISOString(),
  });
}
