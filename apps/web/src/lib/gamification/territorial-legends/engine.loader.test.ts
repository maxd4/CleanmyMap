import { describe, expect, it, vi } from "vitest";

const ageEligibilityMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const resolveActionTerritoryMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/minor-consent-server", () => ({
  isOptionalConsentTreatmentAllowedForUser: ageEligibilityMock,
}));
vi.mock("@/lib/geo/action-territory-resolver", () => ({
  resolveActionTerritory: resolveActionTerritoryMock,
}));

import { loadTerritorialLegendFacts } from "./engine";
import { TERRITORIAL_LEGEND_PAGE_SIZE } from "./pagination";

const attribution = (actionId: string, actionDate = "2026-11-03") => ({
  schemaVersion: "territorial-legend-attribution-v1",
  source: "geo.api.gouv.fr",
  cogYear: 2026,
  actionId,
  actionDate,
  resolvedAt: "2026-11-03T10:00:00.000Z",
  sourceFingerprint: `source-${actionId}`,
  territory: {
    country: { code: "FR", name: "France" },
    region: { code: "11", name: "Île-de-France" },
    department: { code: "75", name: "Paris" },
    commune: { code: "75056", name: "Paris" },
    arrondissement: { code: "75105", name: "Paris 5e arrondissement" },
  },
});

function supabaseFixture(options: { failActionPage?: number } = {}) {
  const actions = Array.from({ length: TERRITORIAL_LEGEND_PAGE_SIZE + 1 }, (_, index) => {
    const id = `action-${String(index).padStart(4, "0")}`;
    return { id, action_date: "2026-11-03", territorial_legend_attribution: attribution(id) };
  });
  const participants = actions.map((action) => ({
    action_id: action.id,
    user_id: "user-1",
    joined_at: "2026-11-03T10:00:00.000Z",
  }));
  const dataByResource = (resource: string, page: number, selectedIds: string[]) => {
    if (resource === "actions") return actions.slice(page * TERRITORIAL_LEGEND_PAGE_SIZE, (page + 1) * TERRITORIAL_LEGEND_PAGE_SIZE);
    if (resource === "action_participants") return participants.filter((row) => selectedIds.includes(row.action_id)).slice(page * TERRITORIAL_LEGEND_PAGE_SIZE, (page + 1) * TERRITORIAL_LEGEND_PAGE_SIZE);
    if (resource === "territorial_legend_consents") return [{ user_id: "user-1", enabled: true, activated_at: "2026-11-01T10:00:00.000Z", revoked_at: null }];
    return [{ id: "user-1", display_name: "Alice", display_name_mode: "public", handle: "alice" }];
  };
  const chain = {
    resource: "",
    selectedIds: [] as string[],
    from: (resource: string) => { chain.resource = resource; return chain; },
    select: () => chain,
    eq: () => chain,
    not: () => chain,
    or: () => chain,
    gte: () => chain,
    lte: () => chain,
    in: (_field: string, ids: string[]) => { chain.selectedIds = ids; return chain; },
    order: () => chain,
    range: (from: number) => Promise.resolve({
      data: options.failActionPage === Math.floor(from / TERRITORIAL_LEGEND_PAGE_SIZE) && chain.resource === "actions"
        ? null
        : dataByResource(chain.resource, Math.floor(from / TERRITORIAL_LEGEND_PAGE_SIZE), chain.selectedIds),
      error: options.failActionPage === Math.floor(from / TERRITORIAL_LEGEND_PAGE_SIZE) && chain.resource === "actions"
        ? new Error("page unavailable")
        : null,
    }),
  };
  return { from: chain.from };
}

describe("territorial legend fact loading", () => {
  it("loads every action and participation page without resolving geography", async () => {
    const facts = await loadTerritorialLegendFacts(supabaseFixture() as never, {
      now: new Date("2026-11-03T12:00:00.000Z"),
    });

    expect(facts.actions).toHaveLength(TERRITORIAL_LEGEND_PAGE_SIZE + 1);
    expect(facts.participations).toHaveLength(TERRITORIAL_LEGEND_PAGE_SIZE + 1);
    expect(facts.actions.at(-1)?.actionId).toBe("action-0500");
    expect(facts.consents).toEqual([expect.objectContaining({ userId: "user-1", ageEligible: true })]);
    expect(resolveActionTerritoryMock).not.toHaveBeenCalled();
  });

  it("fails closed when a later action page cannot be read", async () => {
    await expect(loadTerritorialLegendFacts(supabaseFixture({ failActionPage: 1 }) as never, {
      now: new Date("2026-11-03T12:00:00.000Z"),
    })).rejects.toThrow("page unavailable");
  });

  it("excludes unverifiable attributions instead of falling back to a provider", async () => {
    const fixture = supabaseFixture() as { from: (resource: string) => Record<string, unknown> };
    const originalFrom = fixture.from;
    fixture.from = (resource: string) => {
      const chain = originalFrom(resource);
      const originalRange = chain.range as (from: number, to: number) => Promise<{ data: unknown[]; error: null }>;
      chain.range = async (from: number, to: number) => {
        const result = await originalRange(from, to);
        if (resource === "actions" && from === 0 && result.data[0]) {
          result.data[0] = { ...(result.data[0] as object), territorial_legend_attribution: null };
        }
        return result;
      };
      return chain;
    };
    const facts = await loadTerritorialLegendFacts(fixture as never, {
      now: new Date("2026-11-03T12:00:00.000Z"),
    });
    expect(facts.actions).toHaveLength(TERRITORIAL_LEGEND_PAGE_SIZE);
  });
});
