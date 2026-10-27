import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const fetchUnifiedActionContractsMock = vi.hoisted(() => vi.fn());
const parseEntityTypesParamMock = vi.hoisted(() => vi.fn());
const buildActionInsightsMock = vi.hoisted(() => vi.fn());
const filterActionContractsByScopeMock = vi.hoisted(() => vi.fn());
const resolveReportQueryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/actions/unified-source", () => ({
  fetchUnifiedActionContracts: fetchUnifiedActionContractsMock,
  parseEntityTypesParam: parseEntityTypesParamMock,
}));
vi.mock("@/lib/actions/insights", () => ({ buildActionInsights: buildActionInsightsMock }));
vi.mock("@/lib/actions/data-contract", () => ({
  toActionListItem: vi.fn(),
  toPublicActionListItem: vi.fn(),
}));
vi.mock("@/lib/reports/scope", () => ({ filterActionContractsByScope: filterActionContractsByScopeMock }));
vi.mock("@/lib/reports/csv", () => ({ resolveReportQuery: resolveReportQueryMock, buildDateFloor: vi.fn((days: number) => `floor-${days}`) }));

describe("api/actions query resolution and projections", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getSupabaseServerClientMock.mockReturnValue({ client: true });
    resolveReportQueryMock.mockImplementation((url: URL) => ({
      scopeKind: url.searchParams.get("scope") === "association" ? "association" : "global",
      scopeValue: url.searchParams.get("scopeValue") ?? null,
      association: url.searchParams.get("association") ?? null,
    }));
    parseEntityTypesParamMock.mockImplementation((raw: string | null) => raw ? raw.split(",") : null);
  });

  it("keeps omitted, empty and malformed filters public-safe and bounded", async () => {
    const { resolveActionListQuery } = await import("./route.query");
    const query = resolveActionListQuery(new URL("http://localhost/api/actions?limit=999&days=bad&status=unknown&qualityGrade=Z&toFixPriority=maybe&impact=unknown"));

    expect(query.limit).toBe(200);
    expect(query.days).toBe(90);
    expect(query.readPolicy).toEqual({ status: "approved", usePublicSurfaceSnapshot: true });
    expect(query.qualityGrade).toBeNull();
    expect(query.toFixPriority).toBeNull();
    expect(query.impact).toBeNull();
    expect(query.futureOnly).toBe(false);
    expect(query.snapshotKey).toContain('"status":"approved"');
  });

  it("separates private states and canonicalizes all supported list filters", async () => {
    const { resolveActionListQuery, getActionsSnapshotMeta } = await import("./route.query");
    const query = resolveActionListQuery(new URL("http://localhost/api/actions?scope=association&association=asso&scopeValue=asso&limit=4&days=30&types=spot,action&status=all&qualityGrade=A&toFixPriority=YES&impact=critique&view=future"));

    expect(query.readPolicy).toEqual({ status: null, usePublicSurfaceSnapshot: false });
    expect(query.types).toEqual(["spot", "action"]);
    expect(query.qualityGrade).toBe("A");
    expect(query.toFixPriority).toBe(true);
    expect(query.impact).toBe("critique");
    expect(query.futureOnly).toBe(true);
    expect(JSON.parse(query.snapshotKey)).toMatchObject({ scopeKind: "association", scopeValue: "asso", types: "action,spot", toFixPriority: "true" });
    expect(getActionsSnapshotMeta(query)).toMatchObject({ limit: 4, status: null, impact: "critique" });
  });

  it("filters future projections, applies the requested limit and preserves partial-source health", async () => {
    const { buildActionsRoutePayload, resolveActionListQuery } = await import("./route.query");
    const query = resolveActionListQuery(new URL("http://localhost/api/actions?limit=1&view=future"));
    const future = {
      id: "future",
      source: "actions",
      type: "action",
      publishedAt: "2026-10-01T10:00:00.000Z",
      dates: { observedAt: "2099-01-01", eventStartTime: "10:00" },
      metadata: { actionPhase: "pre_action" },
    };
    const past = { ...future, id: "past", dates: { observedAt: "2020-01-01", eventStartTime: "10:00" } };
    fetchUnifiedActionContractsMock.mockResolvedValue({
      items: [future, past],
      sourceHealth: { partial: true, failedSources: ["legacy"], availableSources: ["actions"], warnings: ["partial"] },
    });
    filterActionContractsByScopeMock.mockImplementation((items: unknown[]) => items);
    buildActionInsightsMock.mockReturnValue({ qualityGrade: "B", toFixPriority: false, impactLevel: "moyen" });
    const mapper = vi.fn((contract: { id: string }) => ({
      id: contract.id,
      quality_grade: "B",
      to_fix_priority: false,
      impact_level: "moyen",
    }));

    const payload = await buildActionsRoutePayload(query, mapper as never);

    expect(fetchUnifiedActionContractsMock).toHaveBeenCalledWith({ client: true }, expect.objectContaining({ limit: 2, futureOnly: true, floorDate: null }));
    expect(mapper).toHaveBeenCalledTimes(1);
    expect(payload).toMatchObject({ count: 1, items: [{ id: "future" }], partialSource: true });
  });

  it("applies quality, priority and impact predicates before truncating the list", async () => {
    const { buildActionsRoutePayload, resolveActionListQuery } = await import("./route.query");
    const query = resolveActionListQuery(new URL("http://localhost/api/actions?limit=10&qualityGrade=A&toFixPriority=false&impact=fort&days=30"));
    const contracts = [{ id: "kept" }, { id: "filtered" }];
    fetchUnifiedActionContractsMock.mockResolvedValue({ items: contracts, sourceHealth: { partial: false } });
    filterActionContractsByScopeMock.mockImplementation((items: unknown[]) => items);
    buildActionInsightsMock.mockReturnValue({});
    const mapper = vi.fn((contract: { id: string }) => contract.id === "kept"
      ? { id: contract.id, quality_grade: "A", to_fix_priority: false, impact_level: "fort" }
      : { id: contract.id, quality_grade: "B", to_fix_priority: true, impact_level: "faible" });

    const payload = await buildActionsRoutePayload(query, mapper as never);

    expect(payload.items).toEqual([{ id: "kept", quality_grade: "A", to_fix_priority: false, impact_level: "fort" }]);
  });
});
