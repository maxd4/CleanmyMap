import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserEffectiveAccessMock = vi.hoisted(() => vi.fn());
const loadPilotageOverviewMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserEffectiveAccess: getCurrentUserEffectiveAccessMock,
}));

vi.mock("@/lib/actions/unified-source", () => ({
  parseEntityTypesParam: vi.fn(() => null),
}));

vi.mock("@/lib/pilotage/overview", () => ({
  loadPilotageOverview: loadPilotageOverviewMock,
}));

describe("GET /api/pilotage/overview authorization", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserEffectiveAccessMock.mockResolvedValue({
      canAccessPilotage: true,
    });
    loadPilotageOverviewMock.mockResolvedValue({ generatedAt: "2026-08-26T00:00:00.000Z" });
  });

  it("rejects anonymous requests before loading the overview", async () => {
    authMock.mockResolvedValueOnce({ userId: null });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/pilotage/overview"));

    expect(response.status).toBe(401);
    expect(loadPilotageOverviewMock).not.toHaveBeenCalled();
  });

  it("rejects authenticated roles outside the pilotage contract", async () => {
    getCurrentUserEffectiveAccessMock.mockResolvedValueOnce({
      canAccessPilotage: false,
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/pilotage/overview"));

    expect(response.status).toBe(403);
    expect(loadPilotageOverviewMock).not.toHaveBeenCalled();
  });

  it("scopes coordinateur data to the authenticated user's organized actions", async () => {
    getCurrentUserEffectiveAccessMock.mockResolvedValueOnce({
      canAccessPilotage: true,
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/pilotage/overview?days=30"));

    expect(response.status).toBe(200);
    expect(loadPilotageOverviewMock).toHaveBeenCalledWith({
      periodDays: 30,
      limit: 1500,
      types: null,
      scope: { kind: "organized", userId: "user-1" },
    });
  });

  it("does not let a query parameter choose another user's scope", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/pilotage/overview?userId=user-2&scope=global"),
    );

    expect(response.status).toBe(200);
    expect(loadPilotageOverviewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: { kind: "organized", userId: "user-1" },
      }),
    );
  });
});
