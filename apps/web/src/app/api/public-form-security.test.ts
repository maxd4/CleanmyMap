import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimitStore } from "@/lib/rate-limit/store";

const verifyRateLimitMock = vi.hoisted(() => vi.fn(async () => ({
  allowed: true,
  limit: 1,
  remaining: 1,
})));
const createServerRateLimitResponseMock = vi.hoisted(() => vi.fn(() => null));
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn(() => ({
  from: vi.fn(),
})));
const sendCreatorInboxEmailMock = vi.hoisted(() => vi.fn(async () => true));
const sendEmailMock = vi.hoisted(() => vi.fn(async () => ({ id: "mock", status: "mocked" })));
const ensureEmailQuotaAvailableMock = vi.hoisted(() => vi.fn(async () => undefined));
const appendPartnerOnboardingRequestMock = vi.hoisted(() => vi.fn(async () => ({
  id: "partner-request-mock",
  status: "pending_admin_review",
})));
const appendPromotionRequestMock = vi.hoisted(() => vi.fn(async () => ({
  id: "promotion-request-mock",
  status: "pending_owner_review",
})));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: "user-1" })),
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: vi.fn(async () => ({ email: "user@example.org" })),
  getCurrentUserRoleLabel: vi.fn(async () => "benevole"),
  requireCreatorAccess: vi.fn(async () => ({ ok: true, userId: "user-1" })),
}));

vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: verifyRateLimitMock,
  createServerRateLimitResponse: createServerRateLimitResponseMock,
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
  appendPartnerOnboardingRequest: appendPartnerOnboardingRequestMock,
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
        headers: { "content-type": "application/json" },
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
});
