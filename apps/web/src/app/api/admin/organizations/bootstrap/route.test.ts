import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminAccess: vi.fn(), rateLimit: vi.fn(), resolveActionOrganizer: vi.fn(),
  from: vi.fn(), rpc: vi.fn(), getUser: vi.fn(), getUserList: vi.fn(),
}));
vi.mock("@/lib/authz", () => ({ requireAdminAccess: mocks.requireAdminAccess }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: mocks.rateLimit }));
vi.mock("@/lib/actions/organizer-directory-registry", () => ({ resolveActionOrganizer: mocks.resolveActionOrganizer }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: () => ({ from: mocks.from, rpc: mocks.rpc }) }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: async () => ({ users: { getUser: mocks.getUser, getUserList: mocks.getUserList } }) }));

const requestBody = { entryId: "entry-alpha", organizerRef: "alpha-ref", mandateVerified: true, requestId: "00000000-0000-4000-8000-000000000001" };
const entry = { source_request_id: "request-alpha", publication_status: "accepted" };
const source = { submitted_by_user_id: "submitter-a", status: "accepted", organization_type: "entreprise", legal_identity: "alpha-ref" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdminAccess.mockResolvedValue({ ok: true, userId: "admin-session" });
  mocks.rateLimit.mockResolvedValue(null);
  mocks.resolveActionOrganizer.mockResolvedValue({ organizerId: "alpha-ref" });
  mocks.getUser.mockResolvedValue({ id: "submitter-a" });
  mocks.getUserList.mockResolvedValue({ data: [] });
  mocks.from.mockImplementation((table: string) => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({
      data: table === "partner_annuaire_entries" ? entry : source, error: null,
    }) }) }),
  }));
  mocks.rpc.mockResolvedValue({ data: "00000000-0000-4000-8000-000000000010", error: null });
});
afterEach(() => vi.clearAllMocks());

describe("admin organization bootstrap mandate boundary", () => {
  it("requires an admin before reading partner data", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: false, status: 403 });
    const { GET, POST } = await import("./route");
    const listResponse = await GET(new Request("https://example.test/api/admin/organizations/bootstrap"));
    const response = await POST(new Request("https://example.test/api/admin/organizations/bootstrap", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody),
    }));
    expect(listResponse.status).toBe(403);
    expect(response.status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("lists only accepted company applications and omits Clerk account identifiers", async () => {
    mocks.rpc.mockResolvedValue({ data: [{
      entry_id: "entry-alpha", submitted_by_clerk_id: "submitter-a", organization_name: "Alpha",
      organization_type: "entreprise", legal_identity: "alpha-ref",
    }], error: null });
    mocks.getUserList.mockResolvedValue({ data: [{
      id: "submitter-a", primaryEmailAddressId: "email-a",
      emailAddresses: [{ id: "email-a", emailAddress: "owner@example.test" }],
    }] });

    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.test/api/admin/organizations/bootstrap"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(body.applications).toEqual([{
      entryId: "entry-alpha", organizationName: "Alpha", legalIdentity: "alpha-ref",
      organizationType: "entreprise", applicantEmail: "owner@example.test", applicantAccountAvailable: true,
    }]);
    expect(JSON.stringify(body)).not.toContain("submitter-a");
    expect(mocks.rpc).toHaveBeenCalledWith("list_organization_bootstrap_queue");
  });

  it("returns a safe unavailable response when the queue or applicant lookup fails", async () => {
    const { GET } = await import("./route");
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000" } });
    const databaseFailure = await GET(new Request("https://example.test/api/admin/organizations/bootstrap"));
    expect(databaseFailure.status).toBe(503);
    expect(await databaseFailure.json()).toEqual({ error: "Demandes indisponibles." });

    mocks.rpc.mockResolvedValueOnce({ data: [{
      entry_id: "entry-alpha", submitted_by_clerk_id: "submitter-a", organization_name: "Alpha",
      organization_type: "entreprise", legal_identity: "alpha-ref",
    }], error: null });
    mocks.getUserList.mockRejectedValueOnce(new Error("provider detail must not escape"));
    const providerFailure = await GET(new Request("https://example.test/api/admin/organizations/bootstrap"));
    expect(providerFailure.status).toBe(503);
    expect(JSON.stringify(await providerFailure.json())).not.toContain("provider detail");
  });

  it("rejects a mismatch between the accepted application identity and actual organizer", async () => {
    mocks.from.mockImplementation((table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({
        data: table === "partner_annuaire_entries" ? entry : { ...source, legal_identity: "different-ref" }, error: null,
      }) }) }),
    }));
    const { POST } = await import("./route");
    const response = await POST(new Request("https://example.test/api/admin/organizations/bootstrap", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody),
    }));
    expect(response.status).toBe(409);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("bootstraps only after exact mandate, organizer and submitting-account checks", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("https://example.test/api/admin/organizations/bootstrap", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody),
    }));
    expect(response.status).toBe(200);
    expect(mocks.getUser).toHaveBeenCalledWith("submitter-a");
    expect(mocks.rpc).toHaveBeenCalledWith("bootstrap_organization", {
      p_entry: "entry-alpha", p_ref: "alpha-ref", p_actor: "admin-session", p_request: requestBody.requestId,
    });
  });

  it("blocks rate-limited and malformed activation requests before reading organization data", async () => {
    const { POST } = await import("./route");
    mocks.rateLimit.mockResolvedValueOnce(new Response("slow down", { status: 429 }));
    const limited = await POST(new Request("https://example.test/api/admin/organizations/bootstrap", { method: "POST", body: JSON.stringify(requestBody) }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("cache-control")).toBe("private, no-store");
    const malformed = await POST(new Request("https://example.test/api/admin/organizations/bootstrap", { method: "POST", body: "{" }));
    expect(malformed.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each([["42501", 403], ["23505", 409], ["22023", 409], ["XX000", 503]] as const)("maps activation RPC error %s to HTTP %s", async (code, status) => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code } });
    const { POST } = await import("./route");
    const response = await POST(new Request("https://example.test/api/admin/organizations/bootstrap", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody),
    }));
    expect(response.status).toBe(status);
    expect(JSON.stringify(await response.json())).not.toContain(code);
  });
});
