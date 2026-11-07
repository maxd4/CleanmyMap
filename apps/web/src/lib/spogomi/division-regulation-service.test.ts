import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { divisionRegulationInputSchema, updateSpogomiDivisionRegulation } from "./division-regulation-service";

vi.mock("./preparation/preparation-event-access", () => ({
  loadSpogomiEventForOrganizer: vi.fn(),
}));

import { loadSpogomiEventForOrganizer } from "./preparation/preparation-event-access";

const baseInput = {
  expectedRevision: 4,
  regulationVersion: "casual-test-v1",
  regulationStatus: "complete" as const,
  regulationSourceReference: "synthetic://casual-test-v1",
  teamSize: { casual: { minMembers: 2, maxMembers: 4 } },
  rounding: { decimals: 1, mode: "half_up" as const },
  penalties: [],
  eligibility: { minimumPresentParticipants: 1, requiresAllCategories: true },
  tiebreakers: ["sporting_score" as const],
  categories: [{ id: null, code: "mass", label: "Masse", measurementKind: "mass" as const, unit: "g", coefficient: 1, coefficientStatus: "confirmed" as const, environmentalCategorySlug: "mass", displayOrder: 0, isComplete: true }],
  environmentMappings: [{ id: null, categoryRuleId: null, categoryCode: "mass", environmentalCategorySlug: "mass", sourceField: "mass_grams" as const, sourceUnit: "g", targetUnit: "grams" as const, unitFactorToTarget: 1, countsTowardTotal: true, isMegots: false, mappingStatus: "mapped" as const, exclusionReason: null }],
};

describe("SPOGOMI division regulation service", () => {
  it("parses a complete synthetic Casual configuration without assigning official provenance", () => {
    const parsed = divisionRegulationInputSchema.safeParse(baseInput);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.regulationSourceReference).toBe("synthetic://casual-test-v1");
  });

  it("rejects unknown fields at the API boundary", () => {
    const parsed = divisionRegulationInputSchema.safeParse({ ...baseInput, unexpectedPermission: true });
    expect(parsed.success).toBe(false);
  });

  it("checks organizer access before invoking the service-only RPC", async () => {
    vi.mocked(loadSpogomiEventForOrganizer).mockResolvedValueOnce(false);
    const rpc = vi.fn();
    await expect(updateSpogomiDivisionRegulation({ supabase: { rpc } as never, eventId: "event-1", divisionId: "division-1", userId: "user-1", input: baseInput })).rejects.toThrow(/Forbidden/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("passes the full division payload and preserves stale-revision conflicts", async () => {
    vi.mocked(loadSpogomiEventForOrganizer).mockResolvedValueOnce({ id: "event-1" } as never);
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "40001", message: "stale" } });
    await expect(updateSpogomiDivisionRegulation({ supabase: { rpc } as never, eventId: "event-1", divisionId: "division-1", userId: "user-1", input: baseInput })).rejects.toThrow(/révision/);
    expect(rpc).toHaveBeenCalledWith("spogomi_update_division_regulation", expect.objectContaining({ p_categories: baseInput.categories, p_environment_mappings: baseInput.environmentMappings, p_expected_revision: 4 }));
  });
});
