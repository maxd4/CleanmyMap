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

function request() {
  return new Request("http://localhost/api/newsletter/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "Person@Example.org",
      gdprConsent: true,
      source: "security-01-test",
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
});
