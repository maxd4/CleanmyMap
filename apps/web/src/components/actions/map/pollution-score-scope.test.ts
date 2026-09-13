import { describe, expect, it, vi } from "vitest";
import type { ActionMapItem } from "@/lib/actions/types";
import { buildActionDataContract, toActionMapItem } from "@/lib/actions/data-contract";
import {
  CLEAN_PLACE_COLOR,
  TRASH_SPOTTER_NEUTRAL_COLOR,
} from "@/components/actions/map-marker-categories";
import { resolvePointColor } from "./map-layers.shared";
import {
  computeAveragePollutionScore,
  type PollutionScoreReferences,
} from "@/lib/actions/pollution/pollution-score";
import {
  POLLUTION_SCORE_UNAVAILABLE_COLOR,
  resolveActionPollutionScore,
} from "./pollution-score-scope";

const references: PollutionScoreReferences = {
  wastePerVolunteer: 20,
  buttsPerVolunteer: 2_000,
  departmentReferences: {
    "75": {
      wastePerVolunteer: 40,
      buttsPerVolunteer: 1_000,
      eligibleActionCount: 5,
    },
    "13": {
      wastePerVolunteer: 80,
      buttsPerVolunteer: 2_000,
      eligibleActionCount: 3,
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
      wasteKg: 20,
      cigaretteButts: 1_000,
      volunteersCount: 1,
    }),
  );
}

describe("pollution score scope", () => {
  it("defaults to the global average and keeps Global → Département → Global local", () => {
    const action = buildAction("75");
    const global = resolveActionPollutionScore(action, references, {
      now: "2026-09-13",
    });
    const department = resolveActionPollutionScore(action, references, {
      scope: "department",
      now: "2030-01-01",
    });
    const globalAgain = resolveActionPollutionScore(action, references, {
      scope: "global",
      now: "2026-09-13",
    });

    expect(global.source).toBe("global");
    expect(global.historicalScore).toBe(75);
    expect(department.departmentRelativeScore).toBe(75);
    expect(globalAgain).toEqual(global);
  });

  it("switches synchronously from already loaded references without fetching", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const action = buildAction("75");

    resolveActionPollutionScore(action, references, { scope: "global" });
    resolveActionPollutionScore(action, references, { scope: "department" });
    resolveActionPollutionScore(action, references, { scope: "global" });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("uses the persisted department reference, so the same measures can differ by department", () => {
    const paris = resolveActionPollutionScore(buildAction("75"), references, {
      scope: "department",
    });
    const bouchesDuRhone = resolveActionPollutionScore(
      buildAction("13"),
      references,
      { scope: "department" },
    );

    expect(paris.departmentRelativeScore).toBe(75);
    expect(bouchesDuRhone.departmentRelativeScore).toBe(38);
    expect(paris.departmentRelativeScore).not.toBe(
      bouchesDuRhone.departmentRelativeScore,
    );
  });

  it("does not send a department score through the temporal projection", () => {
    const action = buildAction("75");
    const department = resolveActionPollutionScore(action, references, {
      scope: "department",
      now: "2030-01-01",
      displayMode: "projected_today",
    });
    const global = resolveActionPollutionScore(action, references, {
      scope: "global",
      now: "2030-01-01",
      displayMode: "projected_today",
    });

    expect(department.score).toBe(department.departmentRelativeScore);
    expect(department.score).toBe(75);
    expect(global.source).toBe("global");
  });

  it.each([
    { departmentCode: null, label: "department code absent" },
    { departmentCode: "99", label: "department reference absent" },
  ])("returns an explicit unavailable state when $label", ({ departmentCode }) => {
    const result = resolveActionPollutionScore(
      buildAction(departmentCode),
      references,
      { scope: "department" },
    );

    expect(result.score).toBeNull();
    expect(result.availability).toBe("department_unavailable");
  });

  it("does not make a department with fewer than two eligible actions look valid", () => {
    const result = resolveActionPollutionScore(
      buildAction("75"),
      {
        ...references,
        departmentReferences: {
          ...references.departmentReferences,
          "75": {
            wastePerVolunteer: 40,
            buttsPerVolunteer: 1_000,
            eligibleActionCount: 1,
          },
        },
      },
      { scope: "department" },
    );

    expect(result.score).toBeNull();
    expect(resolvePointColor(buildAction("75"), {
      ...references,
      departmentReferences: {
        ...references.departmentReferences,
        "75": {
          wastePerVolunteer: 40,
          buttsPerVolunteer: 1_000,
          eligibleActionCount: 1,
        },
      },
    }, new Date(), "projected_today", null, "department")).toBe(
      POLLUTION_SCORE_UNAVAILABLE_COLOR,
    );
  });

  it("keeps green exclusive to clean places and leaves Trash Spotter neutral", () => {
    const cleanPlace = toActionMapItem(
      buildActionDataContract({
        id: "clean-place",
        type: "clean_place",
        status: "approved",
        source: "trash_spotter_spots",
        observedAt: "2026-09-13",
        locationLabel: "Lieu propre",
        latitude: 48.85,
        longitude: 2.35,
      }),
    );
    const spot = toActionMapItem(
      buildActionDataContract({
        id: "spot",
        type: "spot",
        status: "approved",
        source: "trash_spotter_spots",
        sourceStatus: "validated",
        observedAt: "2026-09-13",
        locationLabel: "Trash Spotter",
        latitude: 48.85,
        longitude: 2.35,
      }),
    );

    expect(resolvePointColor(cleanPlace, references, new Date(), "projected_today", null, "department")).toBe(CLEAN_PLACE_COLOR);
    expect(resolvePointColor(spot, references, new Date(), "projected_today", null, "department")).toBe(TRASH_SPOTTER_NEUTRAL_COLOR);
  });

  it("uses the average of the waste and butts components", () => {
    const action = buildAction("75");
    const result = resolveActionPollutionScore(action, references, {
      scope: "department",
    });
    expect(result.departmentRelativeScore).toBe(
      computeAveragePollutionScore({ wasteScore: 50, buttsScore: 100 }),
    );
  });
});
