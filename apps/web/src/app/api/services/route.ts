import { NextResponse } from "next/server";
import { env, isConfigured } from "@/lib/env";

export async function GET() {
  const services = {
    supabase: isConfigured(env.NEXT_PUBLIC_SUPABASE_URL) ? "add" : "missing",
    vercel: "add",
    clerk: isConfigured(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) ? "add" : "missing",
    cloudflare: "defer",
    sentry: isConfigured(env.SENTRY_DSN) || isConfigured(env.NEXT_PUBLIC_SENTRY_DSN) ? "add" : "missing",
    resend: isConfigured(env.RESEND_API_KEY) ? "add" : "missing",
    posthog: isConfigured(env.NEXT_PUBLIC_POSTHOG_KEY) ? "add" : "missing",
    pinecone: "defer",
    stripe: "defer",
    upstash: "defer",
    uptimerobot: "add_external",
  };

  return NextResponse.json({
    status: "ok",
    services,
    timestamp: new Date().toISOString(),
  });
}
