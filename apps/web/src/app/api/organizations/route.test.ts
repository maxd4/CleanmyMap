import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  rateLimit: vi.fn(),
  listOrganizations: vi.fn(),
  readOrganization: vi.fn(),
  mutateOrganization: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: mocks.rateLimit }));
vi.mock("@/lib/organizations/service", () => ({
  listOrganizations: mocks.listOrganizations,
  readOrganization: mocks.readOrganization,
  mutateOrganization: mocks.mutateOrganization,
  OrganizationServiceError: class OrganizationServiceError extends Error { constructor(public status: number) { super(); } },
}));

beforeEach(() => {
  mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "clerk-session-user" });
  mocks.rateLimit.mockResolvedValue(null);
  mocks.listOrganizations.mockResolvedValue([]);
  mocks.readOrganization.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000001" });
  mocks.mutateOrganization.mockResolvedValue(undefined);
});

afterEach(() => vi.clearAllMocks());

describe("/api/organizations", () => {
  it("refuses anonymous reads before loading organization data", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: false, status: 401 });
    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.test/api/organizations"));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.listOrganizations).not.toHaveBeenCalled();
  });

  it("binds a workspace lookup to the verified Clerk session", async () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const { GET } = await import("./route");
    const response = await GET(new Request(`https://example.test/api/organizations?organizationId=${id}`));
    expect(response.status).toBe(200);
    expect(mocks.readOrganization).toHaveBeenCalledWith("clerk-session-user", id, 0);
  });

  it("rejects a client supplied actor and does not mutate", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("https://example.test/api/organizations", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationId: "00000000-0000-4000-8000-000000000001", requestId: "00000000-0000-4000-8000-000000000002", operation: "accept", membershipId: "00000000-0000-4000-8000-000000000003", actor: "clerk-victim" }),
    }));
    expect(response.status).toBe(400);
    expect(mocks.mutateOrganization).not.toHaveBeenCalled();
  });

  it("passes only the session identity to the service for a valid mutation", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("https://example.test/api/organizations", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationId: "00000000-0000-4000-8000-000000000001", requestId: "00000000-0000-4000-8000-000000000002", operation: "accept", membershipId: "00000000-0000-4000-8000-000000000003" }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.mutateOrganization).toHaveBeenCalledWith("clerk-session-user", expect.objectContaining({ operation: "accept" }));
  });
});
