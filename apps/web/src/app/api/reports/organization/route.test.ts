import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  rateLimit: vi.fn(),
  loadOrganizationReport: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: mocks.rateLimit }));
vi.mock("@/lib/organizations/report", () => ({ loadOrganizationReport: mocks.loadOrganizationReport }));
vi.mock("@/lib/organizations/service", () => ({ OrganizationServiceError: class OrganizationServiceError extends Error { constructor(public status: number) { super(); } } }));

const scope = {
  organizationId: "00000000-0000-4000-8000-000000000001", siteId: null, campaignId: null,
  from: "2026-01-01", to: "2026-12-31",
};

beforeEach(() => {
  mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "clerk-session-user" });
  mocks.rateLimit.mockResolvedValue(null);
  mocks.loadOrganizationReport.mockResolvedValue([{ date: "2026-06-01", massKg: 0, impactMassKg: null, massSource: null, butts: null, participations: 0, durationMinutes: null }]);
});

afterEach(() => vi.clearAllMocks());

describe("POST /api/reports/organization", () => {
  it("refuses anonymous requests before resolving any private scope", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: false, status: 401 });
    const { POST } = await import("./route");
    const response = await POST(new Request("https://example.test/api/reports/organization", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.loadOrganizationReport).not.toHaveBeenCalled();
  });

  it("rejects a global scope and never falls back to a public report", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("https://example.test/api/reports/organization", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: { organizationId: null, from: scope.from, to: scope.to }, format: "summary" }),
    }));
    expect(response.status).toBe(400);
    expect(mocks.loadOrganizationReport).not.toHaveBeenCalled();
  });

  it("returns only the bounded canonical aggregate under the session identity", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("https://example.test/api/reports/organization", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope, format: "summary" }),
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({ actions: 1, massKg: { value: 0, known: 1, total: 1 } });
    expect(mocks.loadOrganizationReport).toHaveBeenCalledWith("clerk-session-user", scope, undefined);
  });

  it("exports only the allowlisted aggregate CSV fields", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("https://example.test/api/reports/organization", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope, format: "csv" }),
    }));
    const csv = await response.text();
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(csv.split("\r\n")[0]).toBe("date,massKg,impactMassKg,massSource,butts,participations,durationMinutes");
    expect(csv).not.toContain("clerk-session-user");
  });
});
