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
    wastePerVolunteerHour: 20,
    buttsPerVolunteerHour: 400,
    wasteSourceCount: 3,
    buttsSourceCount: 3,
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
  it("uses the global V2 average and keeps the temporal projection input global", () => {
    const result = resolveActionPollutionScore(buildAction("75"), references, {
      now: "2026-09-13",
    });

    expect(result.source).toBe("global");
    expect(result.historicalScore).toBe(50);
    expect(result.wasteScore).toBe(50);
    expect(result.buttsScore).toBe(50);
  });

  it("does not activate a department score before its dedicated contract exists", () => {
    const result = resolveActionPollutionScore(buildAction("2A"), references, {
      scope: "department",
    });

    expect(result.score).toBeNull();
    expect(result.availability).toBe("department_unavailable");
    expect(
      resolvePointColor(
        buildAction("2A"),
        references,
        new Date(),
        "projected_today",
        null,
        "department",
      ),
    ).toBe(POLLUTION_SCORE_UNAVAILABLE_COLOR);
  });

  it("returns an explicit global unavailable state without a V2 reference", () => {
    const result = resolveActionPollutionScore(buildAction("2B"), null);

    expect(result.score).toBeNull();
    expect(result.availability).toBe("global_unavailable");
  });
});
