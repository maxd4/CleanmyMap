import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const verifyRateLimitMock = vi.hoisted(() => vi.fn());
const createServerRateLimitResponseMock = vi.hoisted(() => vi.fn());
const requireBotIdHumanMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: verifyRateLimitMock,
  createServerRateLimitResponse: createServerRateLimitResponseMock,
}));
vi.mock("@/lib/botid/server", () => ({
  requireBotIdHuman: requireBotIdHumanMock,
}));

function makeSupabase(options: {
  lookup?: { email: string; status: string } | null;
  lookupError?: { message: string } | null;
  upsertError?: { message: string } | null;
}) {
  const lookupQuery = {
    select: vi.fn(() => lookupQuery),
    eq: vi.fn(() => lookupQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options.lookup ?? null,
      error: options.lookupError ?? null,
    }),
  };
  const upsert = vi.fn().mockResolvedValue({ error: options.upsertError ?? null });
  const supabase = {
    from: vi.fn(() => ({
      ...lookupQuery,
      upsert,
    })),
  };
  return { supabase, upsert };
}

function request(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/newsletter/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "Person@Example.org",
      gdprConsent: true,
      source: "security-01-test",
      ...overrides,
    }),
  });
}

describe("POST /api/newsletter/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireBotIdHumanMock.mockResolvedValue(null);
    verifyRateLimitMock.mockResolvedValue({ allowed: true, retryAfter: 0 });
    createServerRateLimitResponseMock.mockReturnValue(null);
  });

  it("reactivates an inactive subscription through the service upsert conflict path", async () => {
    const { supabase, upsert } = makeSupabase({
      lookup: { email: "person@example.org", status: "inactive" },
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { POST } = await import("./route");
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(getSupabaseServerClientMock).toHaveBeenCalledWith(true);
    expect(upsert).toHaveBeenCalledWith(
      {
        email: "person@example.org",
        gdpr_consent: true,
        source: "security-01-test",
        status: "active",
      },
      { onConflict: "email" },
    );
  });

  it("returns a safe server error when the subscription upsert fails", async () => {
    const { supabase } = makeSupabase({
      lookup: { email: "person@example.org", status: "inactive" },
      upsertError: { message: "permission denied for table newsletter_subscriptions" },
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { POST } = await import("./route");
    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Impossible de s'abonner pour le moment" });
  });

  it("keeps an active subscription idempotent without another write", async () => {
    const { supabase, upsert } = makeSupabase({
      lookup: { email: "person@example.org", status: "active" },
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { POST } = await import("./route");
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      message: "Vous êtes déjà inscrit à la newsletter.",
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it.each([
    ["an invalid email", { email: "not-an-email" }],
    ["missing consent", { gdprConsent: false }],
  ])("does not reach Supabase for %s", async (_label, overrides) => {
    const { POST } = await import("./route");
    const response = await POST(request(overrides));

    expect(response.status).toBe(400);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a honeypot signal", { honeypot: "filled" }],
    ["a too-recent timestamp", { submittedAt: Date.now() }],
  ])("does not write for %s", async (_label, overrides) => {
    const { POST } = await import("./route");
    const response = await POST(request(overrides));

    expect(response.status).toBe(429);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("does not write when the server rate limit rejects the request", async () => {
    verifyRateLimitMock.mockResolvedValue({ allowed: false, retryAfter: 30 });
    createServerRateLimitResponseMock.mockReturnValue(new Response(null, { status: 429 }));

    const { POST } = await import("./route");
    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("does not write when BotID rejects the request", async () => {
    requireBotIdHumanMock.mockResolvedValue(new Response(null, { status: 403 }));

    const { POST } = await import("./route");
    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
