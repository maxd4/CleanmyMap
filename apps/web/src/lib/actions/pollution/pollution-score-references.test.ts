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
      departmentReferences: {},
    });
  });

  it("keeps department reference rows in the same snapshot payload", async () => {
    const rpc = vi.fn(async () => ({
      data: [
        { waste_per_volunteer: 12, butts_per_volunteer: 345 },
        {
          department_code: "2B",
          waste_per_volunteer: 80,
          butts_per_volunteer: 1_200,
          eligible_action_count: 4,
        },
      ],
      error: null,
    }));
    const supabase = { rpc } as never;

    await expect(fetchActionPollutionScoreReferences(supabase)).resolves.toEqual({
      wastePerVolunteer: 12,
      buttsPerVolunteer: 345,
      departmentReferences: {
        "2B": {
          wastePerVolunteer: 80,
          buttsPerVolunteer: 1_200,
          eligibleActionCount: 4,
        },
      },
    });
  });

  it("preserves string department codes, including overseas codes", async () => {
    const departmentCodes = ["01", "2A", "2B", "971", "972", "973", "974", "976"];
    const rpc = vi.fn(async () => ({
      data: [
        { waste_per_volunteer: 12, butts_per_volunteer: 345 },
        ...departmentCodes.map((department_code, index) => ({
          department_code,
          waste_per_volunteer: index + 1,
          butts_per_volunteer: (index + 1) * 10,
          eligible_action_count: 2,
        })),
      ],
      error: null,
    }));
    const supabase = { rpc } as never;

    const references = await fetchActionPollutionScoreReferences(supabase);

    expect(Object.keys(references.departmentReferences ?? {}).sort()).toEqual(
      [...departmentCodes].sort(),
    );
    expect(references.departmentReferences?.["01"]?.eligibleActionCount).toBe(2);
    expect(references.departmentReferences?.["2A"]?.wastePerVolunteer).toBe(2);
    expect(references.departmentReferences?.["2B"]?.buttsPerVolunteer).toBe(30);
    expect(references.departmentReferences?.["976"]?.wastePerVolunteer).toBe(8);
  });

  it("omits a department that does not meet the two-action minimum", async () => {
    const rpc = vi.fn(async () => ({
      data: [
        { waste_per_volunteer: 12, butts_per_volunteer: 345 },
        {
          department_code: "99",
          waste_per_volunteer: 8,
          butts_per_volunteer: 120,
          eligible_action_count: 1,
        },
      ],
      error: null,
    }));
    const supabase = { rpc } as never;

    await expect(fetchActionPollutionScoreReferences(supabase)).resolves.toEqual({
      wastePerVolunteer: 12,
      buttsPerVolunteer: 345,
      departmentReferences: {},
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
      {
        wastePerVolunteer: 12,
        buttsPerVolunteer: 345,
        departmentReferences: {},
      },
      {
        wastePerVolunteer: 12,
        buttsPerVolunteer: 345,
        departmentReferences: {},
      },
    ]);
    expect(rpc).toHaveBeenCalledOnce();
  });
});
