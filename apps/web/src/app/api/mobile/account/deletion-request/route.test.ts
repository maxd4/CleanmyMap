import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPublicValidationModule, createServerRateLimitModule } from "@/app/api/test-route-setup";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  clerkClient: vi.fn(),
  append: vi.fn(),
  update: vi.fn(),
  email: vi.fn(),
  verifyRateLimit: vi.fn(),
  rateResponse: vi.fn(),
}));

vi.mock("@/lib/auth/mobile-bearer", () => ({ requireMobileAuthenticatedAccess: mocks.access }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: mocks.clerkClient }));
vi.mock("@/lib/contact/contact-requests-store", () => ({
  appendContactRequest: mocks.append,
  updateContactRequestStatus: mocks.update,
}));
vi.mock("@/lib/community/creator-inbox-email", () => ({ sendCreatorInboxEmail: mocks.email }));
vi.mock("@/lib/rate-limit/server", () => ({
  ...createServerRateLimitModule({ verifyRateLimit: mocks.verifyRateLimit, createServerRateLimitResponse: mocks.rateResponse }),
  enforceServerRateLimitForAuthenticatedUser: async (request: Request, _userId: string, options: { limit?: number; window?: number }) => {
    const result = await mocks.verifyRateLimit(request, options)
    return mocks.rateResponse(result.allowed, result.retryAfter, result)
  },
}));
vi.mock("@/lib/security/validation", () => createPublicValidationModule({
  createPublicRateLimitResponse: vi.fn(() => new Response("rate-limited", { status: 429 })),
  hasHoneypotSignal: vi.fn(() => false),
  hasRecentSubmission: vi.fn(() => false),
}));

describe("POST /api/mobile/account/deletion-request", () => {
  const authenticatedDeletionRequest = () => new Request("http://localhost/api/mobile/account/deletion-request", {
    method: "POST",
    headers: { Authorization: "Bearer clerk" },
    body: JSON.stringify({ confirmation: "SUPPRIMER MON COMPTE" }),
  });

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.access.mockResolvedValue({ ok: true, userId: "user_a" });
    mocks.verifyRateLimit.mockResolvedValue({ allowed: true });
    mocks.rateResponse.mockReturnValue(null);
    mocks.clerkClient.mockResolvedValue({ users: { getUser: vi.fn().mockResolvedValue({
      primaryEmailAddress: { emailAddress: "a@example.com" },
      emailAddresses: [{ emailAddress: "a@example.com" }],
    }) } });
    mocks.append.mockResolvedValue({ id: "request-1", status: "queued" });
    mocks.update.mockResolvedValue({ id: "request-1", status: "sent" });
    mocks.email.mockResolvedValue(true);
  });

  it("refuses an unauthenticated native request before persistence", async () => {
    mocks.access.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/mobile/account/deletion-request", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(mocks.append).not.toHaveBeenCalled();
  });

  it("validates the explicit confirmation and records a non-destructive request", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/mobile/account/deletion-request", {
      method: "POST",
      headers: { Authorization: "Bearer clerk" },
      body: JSON.stringify({ confirmation: "SUPPRIMER" }),
    }));
    expect(response.status).toBe(422);
    expect(mocks.append).not.toHaveBeenCalled();
  });

  it("applies the authenticated abuse limit before persistence", async () => {
    mocks.rateResponse.mockReturnValue(new Response("rate-limited", { status: 429 }));
    const { POST } = await import("./route");
    const response = await POST(authenticatedDeletionRequest());
    expect(response.status).toBe(429);
    expect(mocks.append).not.toHaveBeenCalled();
  });

  it("returns the request id and keeps deletion explicitly unprocessed", async () => {
    const { POST } = await import("./route");
    const response = await POST(authenticatedDeletionRequest());
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body).toMatchObject({ status: "queued", requestId: "request-1", notificationStatus: "sent", deletionProcessed: false });
    expect(mocks.append).toHaveBeenCalledWith(expect.objectContaining({ submittedByUserId: "user_a", input: expect.objectContaining({ requestType: "erasure", pagePath: "/compte/suppression" }) }));
    expect(mocks.email).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: "user_a" }));
  });

  it("reports notification failure without presenting a fake deletion success", async () => {
    mocks.email.mockRejectedValueOnce(new Error("Resend unavailable"));
    const { POST } = await import("./route");
    const response = await POST(authenticatedDeletionRequest());
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body).toMatchObject({ requestId: "request-1", notificationStatus: "failed", deletionProcessed: false });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ requestId: "request-1", status: "failed" }));
  });
});
