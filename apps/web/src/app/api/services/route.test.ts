import { afterEach, beforeEach, describe, expect, it, vi } from"vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const adminAccessErrorJsonResponseMock = vi.hoisted(() => vi.fn());
const isPostHogConfiguredMock = vi.hoisted(() => vi.fn());

const envMock = vi.hoisted(() => ({
 NEXT_PUBLIC_SUPABASE_URL:"https://example.supabase.co",
 NEXT_PUBLIC_SUPABASE_ANON_KEY:"anon",
 SUPABASE_SERVICE_ROLE_KEY:"service",
 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:"pk_test",
 CLERK_SECRET_KEY:"sk_test",
 SENTRY_DSN:"https://dsn.example",
 NEXT_PUBLIC_SENTRY_DSN: undefined,
 RESEND_API_KEY:"re_test",
 RESEND_FROM_EMAIL:"contact@mail.cleanmymap.fr",
 PINECONE_API_KEY:"",
 STRIPE_SECRET_KEY:"",
 STRIPE_WEBHOOK_SECRET:"",
 UPSTASH_REDIS_REST_URL:"",
 UPSTASH_REDIS_REST_TOKEN:"",
 QSTASH_TOKEN:"",
 CLOUDFLARE_API_TOKEN:"",
 UPTIMEROBOT_API_KEY:"",
}));

vi.mock("@/lib/authz", () => ({
 requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
 adminAccessErrorJsonResponse: adminAccessErrorJsonResponseMock,
}));

vi.mock("@/lib/posthog/config", () => ({
 isPostHogConfigured: isPostHogConfiguredMock,
}));

vi.mock("@/lib/env", () => ({
 env: envMock,
 isConfigured: (value: string | undefined) =>
 Boolean(value && value.trim().length > 0),
}));

describe("GET /api/services", () => {
 beforeEach(() => {
 requireAdminAccessMock.mockResolvedValue({ ok: true });
 adminAccessErrorJsonResponseMock.mockReturnValue(
 Response.json({ error:"forbidden" }, { status: 403 }),
 );
 isPostHogConfiguredMock.mockReturnValue(true);
 envMock.CLOUDFLARE_API_TOKEN ="";
 envMock.UPTIMEROBOT_API_KEY ="";
 });

 afterEach(() => {
 vi.clearAllMocks();
 });

 it("returns cloudflare and uptimerobot as ready when keys are configured", async () => {
 envMock.CLOUDFLARE_API_TOKEN ="cf_token";
 envMock.UPTIMEROBOT_API_KEY ="uptime_token";

 const { GET } = await import("./route");
 const response = await GET();
 const body = (await response.json()) as {
 services: Record<string, { state: string }>;
 };

 expect(response.status).toBe(200);
 expect(body.services.cloudflare.state).toBe("ready");
 expect(body.services.uptimerobot.state).toBe("ready");
 });

 it("returns cloudflare and uptimerobot as external when keys are missing", async () => {
 const { GET } = await import("./route");
 const response = await GET();
 const body = (await response.json()) as {
 services: Record<string, { state: string }>;
 };

 expect(response.status).toBe(200);
 expect(body.services.cloudflare.state).toBe("external");
 expect(body.services.uptimerobot.state).toBe("external");
 });
});
