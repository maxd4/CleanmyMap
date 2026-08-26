import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserRoleLabelMock = vi.hoisted(() => vi.fn());
const loadPilotageOverviewMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserRoleLabel: getCurrentUserRoleLabelMock,
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
    getCurrentUserRoleLabelMock.mockResolvedValue("coordinateur");
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
    getCurrentUserRoleLabelMock.mockResolvedValueOnce("benevole");

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/pilotage/overview"));

    expect(response.status).toBe(403);
    expect(loadPilotageOverviewMock).not.toHaveBeenCalled();
  });

  it.each(["coordinateur", "max"])("allows the %s pilotage role", async (role) => {
    getCurrentUserRoleLabelMock.mockResolvedValueOnce(role);

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/pilotage/overview?days=30"));

    expect(response.status).toBe(200);
    expect(loadPilotageOverviewMock).toHaveBeenCalledWith({
      periodDays: 30,
      limit: 1500,
      types: null,
    });
  });
});
