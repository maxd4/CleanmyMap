import { describe, expect, it, vi } from "vitest";
import { fetchActionPollutionScoreReferences } from "./pollution-score-references";
import { DEFAULT_POLLUTION_SCORE_REFERENCES } from "./pollution-score";

describe("fetchActionPollutionScoreReferences", () => {
  it("calls the RPC and normalizes the returned values", async () => {
    const rpc = vi.fn(async () => ({
      data: [{ waste_per_volunteer: 12, butts_per_volunteer: 345 }],
      error: null,
    }));
    const supabase = { rpc } as never;

    const references = await fetchActionPollutionScoreReferences(supabase);

    expect(rpc).toHaveBeenCalledWith("action_pollution_score_references");
    expect(references).toEqual({
      wastePerVolunteer: 12,
      buttsPerVolunteer: 345,
    });
  });

  it("falls back to defaults when the RPC returns unusable values", async () => {
    const rpc = vi.fn(async () => ({
      data: { waste_per_volunteer: 0, butts_per_volunteer: null },
      error: null,
    }));
    const supabase = { rpc } as never;

    const references = await fetchActionPollutionScoreReferences(supabase);

    expect(references).toEqual(DEFAULT_POLLUTION_SCORE_REFERENCES);
  });
});
