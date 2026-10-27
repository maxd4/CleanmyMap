import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getCurrentUserIdentity: vi.fn(),
  appendPartnerOnboardingRequestWithResult: vi.fn(),
  ensureEmailQuotaAvailable: vi.fn(),
  sendEmail: vi.fn(),
  sendCreatorInboxEmail: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: mocks.getCurrentUserIdentity,
  requireCreatorAccess: vi.fn(),
}));
vi.mock("@/lib/partners/onboarding-requests-store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/partners/onboarding-requests-store")>("@/lib/partners/onboarding-requests-store");
  return {
    ...actual,
    appendPartnerOnboardingRequestWithResult: mocks.appendPartnerOnboardingRequestWithResult,
    countPartnerOnboardingRequests: vi.fn(),
    listPartnerOnboardingRequests: vi.fn(),
  };
});
vi.mock("@/lib/services/email", () => ({
  ensureEmailQuotaAvailable: mocks.ensureEmailQuotaAvailable,
  sendEmail: mocks.sendEmail,
}));
vi.mock("@/lib/community/creator-inbox-email", () => ({
  sendCreatorInboxEmail: mocks.sendCreatorInboxEmail,
}));
vi.mock("@/lib/rate-limit/server", () => ({
  withServerRateLimit: (_request: Request, _options: unknown, handler: () => Promise<Response>) => handler(),
}));

import { PartnerOnboardingIdempotencyConflictError } from "@/lib/partners/onboarding-requests-store";
import { POST } from "./route";

const body = {
  organizationName: "Structure partenaire",
  organizationType: "association",
  partnerScope: "local",
  legalIdentity: "Structure Partenaire Association",
  coverage: { arrondissements: [11], quartiers: ["Belleville"] },
  contributionTypes: ["communication"],
  engagementTypes: ["social"],
  relayActions: "Relais des appels locaux.",
  availability: { slots: [{ day: "sat", start: "10:00", end: "12:00" }] },
  contactName: "Contact partenaire",
  contactChannel: "Email",
  contactDetails: "contact@example.com",
  motivation: "Créer un relais local durable.",
  publicWebsiteUrl: "",
  publicWebsiteConsent: false,
  honeypot: "",
};

function request(headers?: HeadersInit, payload = body) {
  return new Request("http://localhost/api/partners/onboarding-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
}

function storedRecord() {
  return {
    id: "request-1",
    status: "pending_admin_review",
    creatorState: "pending",
  };
}

describe("POST /api/partners/onboarding-requests", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.getCurrentUserIdentity.mockResolvedValue({ email: "user@example.com" });
    mocks.ensureEmailQuotaAvailable.mockResolvedValue(undefined);
    mocks.sendEmail.mockResolvedValue(undefined);
    mocks.sendCreatorInboxEmail.mockResolvedValue(undefined);
    mocks.appendPartnerOnboardingRequestWithResult.mockResolvedValue({
      record: storedRecord(),
      replayed: false,
    });
  });

  it("uses the stable header key and notifies only the first committed request", async () => {
    const response = await POST(request({ "Idempotency-Key": "partner-onboarding-1700000000000" }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ status: "queued", replayed: false, requestId: "request-1" });
    expect(mocks.appendPartnerOnboardingRequestWithResult).toHaveBeenCalledWith(expect.objectContaining({
      submittedByUserId: "user-1",
      idempotencyKey: "partner-onboarding-1700000000000",
    }));
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(mocks.sendCreatorInboxEmail).toHaveBeenCalledOnce();
  });

  it("returns the original result for a replay without sending duplicate notifications", async () => {
    mocks.appendPartnerOnboardingRequestWithResult.mockResolvedValueOnce({
      record: storedRecord(),
      replayed: true,
    });

    const response = await POST(request({ "Idempotency-Key": "partner-onboarding-1700000000000" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "queued", replayed: true, requestId: "request-1" });
    expect(mocks.ensureEmailQuotaAvailable).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.sendCreatorInboxEmail).not.toHaveBeenCalled();
  });

  it("maps a contradictory same-key payload to a deterministic conflict", async () => {
    mocks.appendPartnerOnboardingRequestWithResult.mockRejectedValueOnce(new PartnerOnboardingIdempotencyConflictError());

    const response = await POST(request({ "Idempotency-Key": "partner-onboarding-1700000000000" }, {
      ...body,
      organizationName: "Organisation différente",
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "idempotency_conflict",
      message: "Cette clé a déjà été utilisée pour une demande différente.",
    });
    expect(mocks.sendCreatorInboxEmail).not.toHaveBeenCalled();
  });

  it("rejects a request without a stable key when no legacy timestamp exists", async () => {
    const response = await POST(request());

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: "missing_idempotency_key" });
    expect(mocks.appendPartnerOnboardingRequestWithResult).not.toHaveBeenCalled();
  });

  it("rejects malformed header keys before persistence", async () => {
    const response = await POST(request({ "Idempotency-Key": "too-short" }));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: "invalid_idempotency_key" });
    expect(mocks.appendPartnerOnboardingRequestWithResult).not.toHaveBeenCalled();
  });
});
