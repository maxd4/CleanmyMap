import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchActionPollutionScoreReferences,
  invalidateActionPollutionScoreReferencesCache,
} from "./pollution-score-references";
import { DEFAULT_POLLUTION_SCORE_REFERENCES } from "./pollution-score";

describe("fetchActionPollutionScoreReferences", () => {
  beforeEach(() => {
    invalidateActionPollutionScoreReferencesCache();
  });

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

  it("does not mix one runtime reference with one default reference", async () => {
    const rpc = vi.fn(async () => ({
      data: { waste_per_volunteer: 100, butts_per_volunteer: null },
      error: null,
    }));
    const supabase = { rpc } as never;

    await expect(fetchActionPollutionScoreReferences(supabase)).resolves.toEqual(
      DEFAULT_POLLUTION_SCORE_REFERENCES,
    );
  });

  it("coalesces concurrent server reads of the public reference", async () => {
    let resolveRpc!: (value: { data: unknown; error: null }) => void;
    const rpc = vi.fn(
      () =>
        new Promise<{ data: unknown; error: null }>((resolve) => {
          resolveRpc = resolve;
        }),
    );
    const supabase = { rpc } as never;

    const first = fetchActionPollutionScoreReferences(supabase);
    const second = fetchActionPollutionScoreReferences(supabase);
    resolveRpc({
      data: [{ waste_per_volunteer: 12, butts_per_volunteer: 345 }],
      error: null,
    });

    await expect(Promise.all([first, second])).resolves.toEqual([
      { wastePerVolunteer: 12, buttsPerVolunteer: 345 },
      { wastePerVolunteer: 12, buttsPerVolunteer: 345 },
    ]);
    expect(rpc).toHaveBeenCalledOnce();
  });
});
