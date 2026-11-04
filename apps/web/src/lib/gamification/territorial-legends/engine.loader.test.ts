import { describe, expect, it, vi } from "vitest";

const ageEligibilityMock = vi.hoisted(() => vi.fn());
const resolveActionTerritoryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/minor-consent-server", () => ({
  isOptionalConsentTreatmentAllowedForUser: ageEligibilityMock,
}));
vi.mock("@/lib/geo/action-territory-resolver", () => ({
  resolveActionTerritory: resolveActionTerritoryMock,
}));

import { loadTerritorialLegendFacts } from "./engine";

function supabaseFixture() {
  const chain = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    not: vi.fn(),
    or: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    in: vi.fn(),
  };
  let userIdInCalls = 0;
  chain.from.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.eq.mockImplementation((field: string) => field === "participation_status"
    ? Promise.resolve({ data: [{ action_id: "action-1", user_id: "user-1", joined_at: "2026-11-03T10:00:00.000Z" }], error: null })
    : chain);
  chain.not.mockReturnValue(chain);
  chain.or.mockReturnValue(chain);
  chain.gte.mockReturnValue(chain);
  chain.lte.mockResolvedValue({
    data: [{
      id: "action-1",
      action_date: "2026-11-03",
      latitude: 48.8566,
      longitude: 2.3522,
      derived_geometry_kind: null,
      derived_geometry_geojson: null,
      department_code: "75",
      department_name: "Paris",
    }],
    error: null,
  });
  chain.in.mockImplementation((column: string) => {
    if (column === "action_id") return chain;
    userIdInCalls += 1;
    return userIdInCalls === 1
      ? Promise.resolve({ data: [{ user_id: "user-1", enabled: true, activated_at: "2026-11-01T10:00:00.000Z", revoked_at: null }], error: null })
      : Promise.resolve({ data: [{ id: "user-1", display_name: "Alice", display_name_mode: "public", handle: "alice" }], error: null });
  });
  return chain;
}

describe("territorial legend fact loading", () => {
  it("rechecks current Clerk age eligibility before marking a consent public", async () => {
    ageEligibilityMock.mockResolvedValue(false);
    resolveActionTerritoryMock.mockResolvedValue({
      source: "geo.api.gouv.fr",
      region: { code: "11", name: "Île-de-France" },
      department: { code: "75", name: "Paris" },
      commune: { code: "75056", name: "Paris" },
      arrondissement: { code: "75105", name: "Paris 5e arrondissement" },
    });

    const facts = await loadTerritorialLegendFacts(supabaseFixture() as never, {
      now: new Date("2026-11-03T12:00:00.000Z"),
    });

    expect(ageEligibilityMock).toHaveBeenCalledWith("user-1");
    expect(facts.consents).toEqual([expect.objectContaining({ userId: "user-1", enabled: true, ageEligible: false })]);
    expect(facts.profiles).toEqual([]);
  });
});
