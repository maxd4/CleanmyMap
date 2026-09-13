import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchActionPollutionScoreReferences,
  invalidateActionPollutionScoreReferencesCache,
} from "./pollution-score-references";

const globalReference = {
  wastePerVolunteer: 12,
  buttsPerVolunteer: 345,
  wasteSourceCount: 7,
  buttsSourceCount: 6,
};

describe("fetchActionPollutionScoreReferences", () => {
  beforeEach(() => {
    invalidateActionPollutionScoreReferencesCache();
  });

  it("reads the canonical V2 global row and keeps the reference units", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        scope: "global",
        department_code: null,
        department_name: null,
        waste_per_volunteer: "12",
        butts_per_volunteer: "345",
        waste_source_count: 7,
        butts_source_count: 6,
        updated_at: "2026-09-13T03:00:00.000Z",
      }],
      error: null,
    });

    const references = await fetchActionPollutionScoreReferences({ rpc } as never);

    expect(rpc).toHaveBeenCalledWith("action_pollution_score_references_v2");
    expect(references).toEqual({ global: globalReference, departmentReferences: {} });
  });

  it("normalizes distinct string department codes and keeps insufficient rows", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          scope: "global",
          department_code: null,
          department_name: null,
          waste_per_volunteer: 20,
          butts_per_volunteer: 400,
          waste_source_count: 8,
          butts_source_count: 7,
          eligible_action_count: 9,
        },
        {
          scope: "department",
          department_code: "01",
          department_name: "Ain",
          waste_per_volunteer: 12,
          butts_per_volunteer: 220,
          waste_source_count: 2,
          butts_source_count: 2,
          eligible_action_count: 2,
        },
        {
          scope: "department",
          department_code: "2a",
          department_name: "Corse-du-Sud",
          waste_per_volunteer: 4,
          butts_per_volunteer: null,
          waste_source_count: 2,
          butts_source_count: 0,
          eligible_action_count: 2,
        },
        {
          scope: "department",
          department_code: "2B",
          department_name: "Haute-Corse",
          waste_per_volunteer: 8,
          butts_per_volunteer: 180,
          waste_source_count: 1,
          butts_source_count: 1,
          eligible_action_count: 1,
        },
        {
          scope: "department",
          department_code: "974",
          department_name: "La Réunion",
          waste_per_volunteer: 10,
          butts_per_volunteer: 200,
          waste_source_count: 2,
          butts_source_count: 2,
          eligible_action_count: 2,
        },
      ],
      error: null,
    });

    const references = await fetchActionPollutionScoreReferences({ rpc } as never);

    expect(references?.departmentReferences).toEqual({
      "01": {
        departmentName: "Ain",
        wastePerVolunteer: 12,
        buttsPerVolunteer: 220,
        wasteSourceCount: 2,
        buttsSourceCount: 2,
        eligibleActionCount: 2,
      },
      "2A": {
        departmentName: "Corse-du-Sud",
        wastePerVolunteer: 4,
        buttsPerVolunteer: null,
        wasteSourceCount: 2,
        buttsSourceCount: 0,
        eligibleActionCount: 2,
      },
      "2B": {
        departmentName: "Haute-Corse",
        wastePerVolunteer: 8,
        buttsPerVolunteer: 180,
        wasteSourceCount: 1,
        buttsSourceCount: 1,
        eligibleActionCount: 1,
      },
      "974": {
        departmentName: "La Réunion",
        wastePerVolunteer: 10,
        buttsPerVolunteer: 200,
        wasteSourceCount: 2,
        buttsSourceCount: 2,
        eligibleActionCount: 2,
      },
    });
  });

  it("does not accept a department row as the global source", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        scope: "department",
        department_code: "01",
        department_name: "Ain",
        waste_per_volunteer: 12,
        butts_per_volunteer: 345,
        waste_source_count: 2,
        butts_source_count: 2,
      }],
      error: null,
    });

    await expect(fetchActionPollutionScoreReferences({ rpc } as never)).resolves.toBeNull();
  });

  it("returns no reference when both components have no positive source", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        scope: "global",
        department_code: null,
        department_name: null,
        waste_per_volunteer: null,
        butts_per_volunteer: 0,
        waste_source_count: 0,
        butts_source_count: 0,
      }],
      error: null,
    });

    await expect(fetchActionPollutionScoreReferences({ rpc } as never)).resolves.toBeNull();
  });

  it("propagates the RPC error instead of falling back to old defaults", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: new Error("rpc unavailable"),
    });

    await expect(fetchActionPollutionScoreReferences({ rpc } as never)).rejects.toThrow(
      "rpc unavailable",
    );
  });
});
