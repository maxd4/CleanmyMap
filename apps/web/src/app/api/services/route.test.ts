import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const isPostHogConfiguredMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
  adminAccessErrorJsonResponse: (payload: unknown) =>
    new Response(JSON.stringify(payload), { status: 403 }),
}));

vi.mock("@/lib/posthog/config", () => ({
  isPostHogConfigured: isPostHogConfiguredMock,
}));

describe("GET /api/services", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    isPostHogConfiguredMock.mockReturnValue(false);
    delete process.env["VERCEL"];
    delete process.env["VERCEL_ENV"];
    delete process.env["SENTRY_DSN"];
    delete process.env["NEXT_PUBLIC_SENTRY_DSN"];
    delete process.env["RESEND_API_KEY"];
    delete process.env["EMAIL_FROM"];
    delete process.env["CONTACT_EMAIL"];
    delete process.env["RESEND_FROM_EMAIL"];
    delete process.env["RESEND_REPLY_TO"];
    delete process.env["PINECONE_API_KEY"];
    delete process.env["STRIPE_SECRET_KEY"];
    delete process.env["STRIPE_WEBHOOK_SECRET"];
    delete process.env["UPSTASH_REDIS_REST_URL"];
    delete process.env["UPSTASH_REDIS_REST_TOKEN"];
    delete process.env["QSTASH_TOKEN"];
    delete process.env["UPTIMEROBOT_API_KEY"];
    delete process.env["CLOUDFLARE_API_TOKEN"];
    delete process.env["CLERK_SECRET_KEY"];
    delete process.env["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"];
    delete process.env["SUPABASE_SERVICE_ROLE_KEY"];
    delete process.env["NEXT_PUBLIC_SUPABASE_URL"];
    delete process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  });

  it("returns a degraded summary with timeline when critical services are missing", async () => {
    const { GET } = await import("./route");

    const response = await GET();
    const payload = (await response.json()) as {
      status: string;
      missing: string[];
      summary: { globalState: string; criticalAlertCount: number };
      timeline: Array<{ service: string; severity: string }>;
      services: Record<string, { severity: string; statusMessage: string }>;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private");
    expect(payload.status).toBe("degraded");
    expect(payload.summary.globalState).toBe("degraded");
    expect(payload.summary.criticalAlertCount).toBeGreaterThan(0);
    expect(payload.timeline.length).toBeGreaterThan(0);
    expect(payload.services["supabase"]?.severity).toBe("critical");
    expect(payload.services["supabase"]?.statusMessage).toContain("Supabase");
    expect(payload.missing).toContain("supabase");
  });

  it("marks resend as ready when sender and contact inbox are configured", async () => {
    process.env["RESEND_API_KEY"] = "re_test_key";
    process.env["EMAIL_FROM"] = "CleanMyMap <noreply@cleanmymap.fr>";
    process.env["CONTACT_EMAIL"] = "contact@cleanmymap.fr";

    const { GET } = await import("./route");

    const response = await GET();
    const payload = (await response.json()) as {
      services: Record<string, { state: string }>;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private");
    expect(payload.services["resend"]?.state).toBe("ready");
  });

  it("returns 403 when admin access is denied", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({ ok: false, reason: "forbidden" });
    const { GET } = await import("./route");

    const response = await GET();

    expect(response.status).toBe(403);
  });
});
