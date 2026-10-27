import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimitStore } from "@/lib/rate-limit/store";

const authMock = vi.hoisted(() =>
  vi.fn(async (): Promise<{ userId: string | null }> => ({ userId: "user-1" })),
);
type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter?: number;
};
const verifyRateLimitMock = vi.hoisted(() =>
  vi.fn(async (...args: unknown[]): Promise<RateLimitResult> => {
    void args;
    return { allowed: true, limit: 1, remaining: 1 };
  }),
);
const createServerRateLimitResponseMock = vi.hoisted(() =>
  vi.fn((allowed: boolean, retryAfter?: number, result?: RateLimitResult) => {
    void allowed;
    void retryAfter;
    void result;
    return null;
  }),
);
const enforceServerRateLimitMock = async (request: Request, options: { limit?: number; window?: number }) => {
  const result = await verifyRateLimitMock(request, options);
  return createServerRateLimitResponseMock(result.allowed, result.retryAfter, result);
};
const withServerRateLimitMock = async <T extends Response>(
  request: Request,
  options: { limit?: number; window?: number },
  handler: () => Promise<T>,
) => (await enforceServerRateLimitMock(request, options)) ?? handler();
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn(() => ({
  from: vi.fn(),
})));
const sendCreatorInboxEmailMock = vi.hoisted(() => vi.fn(async () => true));
const sendEmailMock = vi.hoisted(() => vi.fn(async () => ({ id: "mock", status: "mocked" })));
const ensureEmailQuotaAvailableMock = vi.hoisted(() => vi.fn(async () => undefined));
const appendPartnerOnboardingRequestWithResultMock = vi.hoisted(() => vi.fn(async () => ({
  record: {
    id: "partner-request-mock",
    status: "pending_admin_review",
  },
  replayed: false,
})));
const appendPromotionRequestMock = vi.hoisted(() => vi.fn(async () => ({
  id: "promotion-request-mock",
  status: "pending_owner_review",
})));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: vi.fn(async () => ({ email: "user@example.org" })),
  getCurrentUserRoleLabel: vi.fn(async () => "benevole"),
  requireCreatorAccess: vi.fn(async () => ({ ok: true, userId: "user-1" })),
}));

vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: verifyRateLimitMock,
  createServerRateLimitResponse: createServerRateLimitResponseMock,
  enforceServerRateLimit: enforceServerRateLimitMock,
  withServerRateLimit: withServerRateLimitMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/services/email", () => ({
  sendEmail: sendEmailMock,
  ensureEmailQuotaAvailable: ensureEmailQuotaAvailableMock,
}));

vi.mock("@/lib/community/creator-inbox-email", () => ({
  sendCreatorInboxEmail: sendCreatorInboxEmailMock,
}));

vi.mock("@/lib/partners/onboarding-requests-store", () => ({
  appendPartnerOnboardingRequestWithResult: appendPartnerOnboardingRequestWithResultMock,
  countPartnerOnboardingRequests: vi.fn(async () => 0),
  listPartnerOnboardingRequests: vi.fn(async () => []),
}));

vi.mock("@/lib/admin/promotion-requests-store", () => ({
  appendPromotionRequest: appendPromotionRequestMock,
}));

describe("public form security guardrails", () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it("returns a standardized 429 payload for newsletter honeypots", async () => {
    const { POST } = await import("./newsletter/subscribe/route");
    const response = await POST(
      new Request("http://localhost/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "test@example.org",
          gdprConsent: true,
          ageBand: "15_or_over",
          honeypot: "bot",
          submittedAt: Date.now(),
        }),
      }),
    );

    const body = (await response.json()) as {
      error?: string;
      kind?: string;
      status?: string;
    };

    expect(response.status).toBe(429);
    expect(body).toMatchObject({
      error: "Impossible de vous inscrire pour le moment.",
      kind: "validation",
      status: "rate_limited",
    });
  });

  it("returns a standardized 429 payload for partner onboarding honeypots", async () => {
    const { POST } = await import("./partners/onboarding-requests/route");
    const response = await POST(
      new Request("http://localhost/api/partners/onboarding-requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "partner-onboarding-security-1",
        },
        body: JSON.stringify({
          organizationName: "Bas Belleville Atelier",
          organizationType: "commerce",
          partnerScope: "local",
          legalIdentity: "Bas Belleville Atelier SAS",
          coverage: {
            arrondissements: [10, 11],
            quartiers: [],
          },
          contributionTypes: ["accueil"],
          relayActions: "",
          availability: {
            slots: [{ day: "tue", start: "10:00", end: "18:00" }],
          },
          contactName: "Marie Dupont",
          contactChannel: "Email",
          contactDetails: "contact@basbelleville.fr",
          motivation: "Valoriser le quartier avec une vitrine locale utile.",
          honeypot: "bot",
          submittedAt: Date.now(),
        }),
      }),
    );

    const body = (await response.json()) as {
      error?: string;
      kind?: string;
      status?: string;
    };

    expect(response.status).toBe(429);
    expect(body).toMatchObject({
      error: "Impossible d'envoyer la demande pour le moment.",
      kind: "validation",
      status: "rate_limited",
    });
  });

  it("returns a standardized 429 payload for promotion requests", async () => {
    const { POST } = await import("./community/promotion-requests/route");
    const response = await POST(
      new Request("http://localhost/api/community/promotion-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestedRole: "elu",
          motivation: "Je souhaite contribuer davantage au pilotage local.",
          honeypot: "",
          submittedAt: Date.now(),
        }),
      }),
    );

    const body = (await response.json()) as {
      error?: string;
      kind?: string;
      status?: string;
    };

    expect(response.status).toBe(429);
    expect(body).toMatchObject({
      error: "Impossible d'envoyer la demande pour le moment.",
      kind: "validation",
      status: "rate_limited",
    });
  });

  it("keeps partner onboarding and promotion requests server-authenticated", async () => {
    authMock.mockResolvedValueOnce({ userId: null });
    const onboarding = await import("./partners/onboarding-requests/route");
    const onboardingResponse = await onboarding.POST(
      new Request("http://localhost/api/partners/onboarding-requests", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(onboardingResponse.status).toBe(401);

    authMock.mockResolvedValueOnce({ userId: null });
    const promotion = await import("./community/promotion-requests/route");
    const promotionResponse = await promotion.POST(
      new Request("http://localhost/api/community/promotion-requests", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(promotionResponse.status).toBe(401);
  });

  it("escapes partner onboarding content before sending the admin HTML email", async () => {
    sendEmailMock.mockClear();
    authMock.mockResolvedValueOnce({ userId: "user-1" });
    const onboarding = await import("./partners/onboarding-requests/route");
    const response = await onboarding.POST(
      new Request("http://localhost/api/partners/onboarding-requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "partner-onboarding-security-xss",
        },
        body: JSON.stringify({
          organizationName: '<img src=x onerror="alert(1)">',
          organizationType: "commerce",
          partnerScope: "local",
          legalIdentity: "Structure de test XSS",
          coverage: { arrondissements: [10], quartiers: [] },
          contributionTypes: ["communication"],
          relayActions: '<script>alert("relay")</script>',
          availability: { slots: [{ day: "tue", start: "10:00", end: "18:00" }] },
          contactName: "Testeur",
          contactChannel: "Email",
          contactDetails: "test@example.org",
          motivation: "Une motivation suffisamment longue pour passer la validation.",
        }),
      }),
    );

    expect(response.status).toBe(201);
    const emailCall = sendEmailMock.mock.calls.at(0) as [{ html?: unknown }] | undefined;
    const html = String(emailCall?.[0]?.html ?? "");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).toContain("&lt;script&gt;alert(&quot;relay&quot;)&lt;/script&gt;");
    expect(html).not.toContain('<img src=x onerror="alert(1)">');
  });

  it("requires explicit consent for a public website and persists only the normalized public field", async () => {
    authMock.mockResolvedValue({ userId: "user-website" });
    appendPartnerOnboardingRequestWithResultMock.mockClear();
    const onboarding = await import("./partners/onboarding-requests/route");
    const basePayload = {
      organizationName: "Structure publique test",
      organizationType: "association",
      partnerScope: "national",
      legalIdentity: "Structure Publique Test Association",
      coverage: { arrondissements: [], quartiers: [] },
      contributionTypes: ["communication"],
      relayActions: "Relais publics.",
      availability: { slots: [{ day: "tue", start: "10:00", end: "18:00" }] },
      contactName: "Référent privé",
      contactChannel: "Email privé",
      contactDetails: "private@example.org",
      motivation: "Une motivation suffisamment longue pour ce test.",
    };

    const withoutConsent = await onboarding.POST(
      new Request("http://localhost/api/partners/onboarding-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...basePayload,
          publicWebsiteUrl: "https://structure.example.test",
          publicWebsiteConsent: false,
        }),
      }),
    );
    expect(withoutConsent.status).toBe(400);
    expect(appendPartnerOnboardingRequestWithResultMock).not.toHaveBeenCalled();

    const invalidUrl = await onboarding.POST(
      new Request("http://localhost/api/partners/onboarding-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...basePayload,
          publicWebsiteUrl: "mailto:private@example.org",
          publicWebsiteConsent: true,
        }),
      }),
    );
    expect(invalidUrl.status).toBe(400);
    expect(appendPartnerOnboardingRequestWithResultMock).not.toHaveBeenCalled();

    const accepted = await onboarding.POST(
      new Request("http://localhost/api/partners/onboarding-requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "partner-onboarding-security-2",
        },
        body: JSON.stringify({
          ...basePayload,
          publicWebsiteUrl: "  https://structure.example.test  ",
          publicWebsiteConsent: true,
        }),
      }),
    );
    expect(accepted.status).toBe(201);
    expect(appendPartnerOnboardingRequestWithResultMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          publicWebsiteUrl: "https://structure.example.test",
          publicWebsiteConsent: true,
        }),
      }),
    );
  });
});
