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

  it("lists memberships and rejects malformed workspace pagination", async () => {
    const { GET } = await import("./route");
    const listed = await GET(new Request("https://example.test/api/organizations"));
    const invalid = await GET(new Request("https://example.test/api/organizations?offset=-1"));
    expect(listed.status).toBe(200);
    expect(mocks.listOrganizations).toHaveBeenCalledWith("clerk-session-user");
    expect(invalid.status).toBe(400);
    expect(mocks.readOrganization).not.toHaveBeenCalled();
  });

  it("stops GET and POST requests at their authenticated rate limits", async () => {
    const { GET, POST } = await import("./route");
    const limited = () => new Response("slow down", { status: 429 });
    mocks.rateLimit.mockImplementationOnce(async () => limited()).mockImplementationOnce(async () => limited());
    const getResponse = await GET(new Request("https://example.test/api/organizations"));
    const postResponse = await POST(new Request("https://example.test/api/organizations", { method: "POST", body: "{}" }));
    expect(getResponse.status).toBe(429);
    expect(postResponse.status).toBe(429);
    expect(getResponse.headers.get("cache-control")).toBe("private, no-store");
    expect(postResponse.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.listOrganizations).not.toHaveBeenCalled();
    expect(mocks.mutateOrganization).not.toHaveBeenCalled();
  });

  it("maps private workspace failures to stable 403, 409 and 503 responses", async () => {
    const { GET } = await import("./route");
    mocks.readOrganization.mockRejectedValueOnce(new (await import("@/lib/organizations/service")).OrganizationServiceError(403));
    const forbidden = await GET(new Request("https://example.test/api/organizations?organizationId=00000000-0000-4000-8000-000000000001"));
    mocks.readOrganization.mockRejectedValueOnce(new (await import("@/lib/organizations/service")).OrganizationServiceError(409));
    const conflict = await GET(new Request("https://example.test/api/organizations?organizationId=00000000-0000-4000-8000-000000000001"));
    mocks.readOrganization.mockRejectedValueOnce(new Error("private backend detail"));
    const unavailable = await GET(new Request("https://example.test/api/organizations?organizationId=00000000-0000-4000-8000-000000000001"));
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "Périmètre indisponible." });
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({ error: "Demande invalide ou état modifié." });
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({ error: "Service temporairement indisponible." });
  });

  it("rejects malformed JSON and hides mutation failures", async () => {
    const { POST } = await import("./route");
    const malformed = await POST(new Request("https://example.test/api/organizations", { method: "POST", body: "{" }));
    mocks.mutateOrganization.mockRejectedValueOnce(new Error("private backend detail"));
    const failed = await POST(new Request("https://example.test/api/organizations", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationId: "00000000-0000-4000-8000-000000000001", requestId: "00000000-0000-4000-8000-000000000002", operation: "leave" }),
    }));
    expect(malformed.status).toBe(400);
    expect(failed.status).toBe(503);
    expect(await failed.json()).toEqual({ error: "Service temporairement indisponible." });
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
