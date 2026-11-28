import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), fetchRows: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/actions/persistence/queries", () => ({ fetchActionRows: mocks.fetchRows }));
vi.mock("@/lib/actions/unified-source/contracts", () => {
  function toActionContract(row: { id: string; contract?: unknown }) {
    const base = {
      id: row.id, type: "action", status: "approved", source: "actions", sourceStatus: "approved",
      createdByClerkId: "private", dates: { observedAt: "2026-06-01", createdAt: "2026-06-01" },
      location: { label: "private location", latitude: null, longitude: null },
      geometry: { kind: null, geojson: null, confidence: null, geometrySource: null, coordinates: [] },
      metadata: { wasteKg: null, cigaretteButts: null, volunteersCount: null, durationMinutes: 0, collectorsCount: null, collectorsCountProvenance: null, wasteCategories: null, wasteBreakdown: null, wasteMeasurementMethod: null },
      dataQuality: {},
    };
    return row.contract ? { ...base, ...(row.contract as object) } : base;
  }
  return { toActionContract };
});

import { loadOrganizationReport } from "./report";

const scope = { organizationId: "00000000-0000-4000-8000-000000000001", siteId: null, campaignId: null, from: "2026-01-01", to: "2026-12-31" };
const actionId = "00000000-0000-4000-8000-000000000011";
function ids(...values: string[]) { return { data: values.map(action_id => ({ action_id })), error: null }; }

describe("loadOrganizationReport", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockResolvedValue(ids(actionId)); mocks.fetchRows.mockResolvedValue([{ id: actionId }]); });

  it("resolves the authorized scope twice and returns canonical unknowns", async () => {
    const rows = await loadOrganizationReport("clerk-user", scope);
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.rpc).toHaveBeenCalledWith("organization_report_action_ids", expect.objectContaining({ p_actor: "clerk-user", p_org: scope.organizationId, p_limit: 501 }));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ massKg: null, impactMassKg: null, butts: null, participations: null });
    expect(rows[0]).toMatchObject({ collectorsCount: null, collectorsCountProvenance: "historical_unknown", wasteCategories: null, wasteBreakdown: null, wasteMeasurementMethod: null });
  });

  it("preserves the new collectors provenance and waste observation fields", async () => {
    const contract = { metadata: { wasteKg: 4, cigaretteButts: 12, volunteersCount: 8, durationMinutes: 25, collectorsCount: 3, collectorsCountProvenance: "user_confirmed", wasteCategories: ["plastic"], wasteBreakdown: { plastic: 4 }, wasteMeasurementMethod: "weighed" } };
    mocks.fetchRows.mockResolvedValue([{ id: actionId, contract }]);
    const rows = await loadOrganizationReport("clerk-user", scope);
    expect(rows[0]).toMatchObject({ collectorsCount: 3, collectorsCountProvenance: "user_confirmed", wasteCategories: ["plastic"], wasteBreakdown: { plastic: 4 }, wasteMeasurementMethod: "weighed" });
  });

  it("rejects an action outside scope and never falls back to unscoped reads", async () => {
    await expect(loadOrganizationReport("clerk-user", scope, "00000000-0000-4000-8000-000000000099")).rejects.toMatchObject({ status: 403 });
    expect(mocks.fetchRows).not.toHaveBeenCalled();
  });

  it("rejects over-limit and duplicate authorized IDs", async () => {
    mocks.rpc.mockResolvedValueOnce(ids(...Array.from({ length: 501 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`)));
    await expect(loadOrganizationReport("clerk-user", scope)).rejects.toMatchObject({ status: 409 });
    mocks.rpc.mockResolvedValueOnce(ids(actionId, actionId));
    await expect(loadOrganizationReport("clerk-user", scope)).rejects.toMatchObject({ status: 503 });
  });

  it("rejects incomplete reads and scope changes during projection", async () => {
    mocks.fetchRows.mockResolvedValueOnce([]);
    await expect(loadOrganizationReport("clerk-user", scope)).rejects.toMatchObject({ status: 409 });
    mocks.rpc.mockResolvedValueOnce(ids(actionId)).mockResolvedValueOnce(ids());
    await expect(loadOrganizationReport("clerk-user", scope)).rejects.toMatchObject({ status: 409 });
  });
});
