import { describe, expect, it } from "vitest";
import type { ActionMapItem } from "@/lib/actions/types";
import { buildActionDataContract, toActionMapItem } from "@/lib/actions/data-contract";
import {
  POLLUTION_SCORE_UNAVAILABLE_COLOR,
  resolveActionPollutionScore,
} from "./pollution-score-scope";
import { resolvePointColor } from "./map-layers.shared";
import type { PollutionScoreReferences } from "@/lib/actions/pollution/pollution-score";

const references: PollutionScoreReferences = {
  global: {
    wastePerVolunteer: 20,
    buttsPerVolunteer: 400,
    wasteSourceCount: 3,
    buttsSourceCount: 3,
  },
  departmentReferences: {
    "01": {
      departmentName: "Ain",
      wastePerVolunteer: 20,
      buttsPerVolunteer: 400,
      wasteSourceCount: 2,
      buttsSourceCount: 2,
      eligibleActionCount: 2,
    },
    "2A": {
      departmentName: "Corse-du-Sud",
      wastePerVolunteer: 40,
      buttsPerVolunteer: 800,
      wasteSourceCount: 2,
      buttsSourceCount: 2,
      eligibleActionCount: 2,
    },
    "2B": {
      departmentName: "Haute-Corse",
      wastePerVolunteer: null,
      buttsPerVolunteer: 400,
      wasteSourceCount: 0,
      buttsSourceCount: 2,
      eligibleActionCount: 2,
    },
    "974": {
      departmentName: "La Réunion",
      wastePerVolunteer: 40,
      buttsPerVolunteer: 800,
      wasteSourceCount: 1,
      buttsSourceCount: 1,
      eligibleActionCount: 1,
    },
  },
};

function buildAction(departmentCode?: string | null): ActionMapItem {
  return toActionMapItem(
    buildActionDataContract({
      id: `action-${departmentCode ?? "none"}`,
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-09-13",
      locationLabel: "Lieu test",
      latitude: 48.85,
      longitude: 2.35,
      departmentCode,
      wasteKg: 40,
      cigaretteButts: 800,
      volunteersCount: 2,
      durationMinutes: 120,
    }),
    undefined,
    references,
  );
}

describe("pollution score scope", () => {
  it("uses the authorized global score and keeps the temporal projection input global", () => {
    const result = resolveActionPollutionScore(buildAction("75"), references, {
      now: "2026-09-13",
    });

    expect(result.source).toBe("global");
    expect(result.historicalScore).toBe(100);
    expect(result.wasteScore).toBe(100);
    expect(result.buttsScore).toBe(100);
  });

  it("keeps an unknown department explicitly unavailable", () => {
    const result = resolveActionPollutionScore(buildAction("99"), references, {
      scope: "department",
    });

    expect(result.score).toBeNull();
    expect(result.availability).toBe("department_unavailable");
    expect(
      resolvePointColor(
        buildAction("99"),
        references,
        new Date(),
        "projected_today",
        null,
        "department",
      ),
    ).toBe(POLLUTION_SCORE_UNAVAILABLE_COLOR);
  });

  it("uses distinct relative references without changing the global score", () => {
    const globalWithDepartments = resolveActionPollutionScore(buildAction("01"), references, {
      now: "2026-09-13",
    });
    const globalWithoutDepartments = resolveActionPollutionScore(
      buildAction("01"),
      { global: references.global },
      { now: "2026-09-13" },
    );
    const ain = resolveActionPollutionScore(buildAction("01"), references, {
      scope: "department",
    });
    const corse = resolveActionPollutionScore(buildAction("2A"), references, {
      scope: "department",
    });
    const corseLowercase = resolveActionPollutionScore(buildAction("2a"), references, {
      scope: "department",
    });

    expect(globalWithDepartments).toMatchObject({ source: "global", historicalScore: 100 });
    expect(globalWithDepartments).toEqual(globalWithoutDepartments);
    expect(ain).toMatchObject({ score: 100, departmentRelativeScore: 100 });
    expect(corse).toMatchObject({ score: 50, departmentRelativeScore: 50 });
    expect(corseLowercase).toEqual(corse);
    expect(corse.historicalScore).toBeNull();
  });

  it("keeps the maximum departmental component and clamps above-reference values", () => {
    const relative = resolveActionPollutionScore(
      buildAction("01"),
      {
        ...references,
        departmentReferences: {
          ...references.departmentReferences,
          "01": {
            ...references.departmentReferences!["01"],
            wastePerVolunteer: 10,
            buttsPerVolunteer: 400,
          },
        },
      },
      { scope: "department" },
    );

    expect(relative.wasteScore).toBe(100);
    expect(relative.buttsScore).toBe(100);
    expect(relative.departmentRelativeScore).toBe(100);
  });

  it("keeps one documented component available and marks one-action departments insufficient", () => {
    const oneComponent = resolveActionPollutionScore(buildAction("2B"), references, {
      scope: "department",
    });
    const insufficient = resolveActionPollutionScore(buildAction("974"), references, {
      scope: "department",
    });

    expect(oneComponent).toMatchObject({
      score: 100,
      wasteScore: null,
      buttsScore: 100,
      availability: "available",
    });
    expect(insufficient).toMatchObject({
      score: null,
      departmentRelativeScore: null,
      availability: "department_insufficient_data",
    });
  });

  it("returns an explicit global unavailable state without a V2 reference", () => {
    const result = resolveActionPollutionScore(buildAction("2B"), null);

    expect(result.score).toBeNull();
    expect(result.availability).toBe("global_unavailable");
  });
});
