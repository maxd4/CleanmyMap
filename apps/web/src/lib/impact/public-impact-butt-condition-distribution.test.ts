import { describe, expect, it } from "vitest";
import {
  buildImpactTerrain2026PublicResultsFromActions,
} from "./impact-terrain-2026-results";
import { aggregateCigaretteButtsLots } from "@/lib/waste/cigarette-butts";

type TerrainInput = Parameters<
  typeof buildImpactTerrain2026PublicResultsFromActions
>[0][number];

function actionFromLots(
  lots: ReturnType<typeof aggregateCigaretteButtsLots>,
): { metadata: TerrainInput } {
  return {
    metadata: {
      cigaretteButts: lots.summary.totalCount,
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: lots.summary.totalCount,
        cigaretteButtsMassKg: lots.summary.totalMassKg,
        cigaretteButtsVolumeLiters: lots.summary.totalVolumeLiters,
        cigaretteButtsCondition: null,
        cigaretteButtsCountProvenance: "estimated",
        cigaretteButtsMassProvenance: "estimated",
        cigaretteButtsVolumeProvenance: "measured",
        cigaretteButtsConversionFormulaVersion: null,
        cigaretteButtsLots: lots.lots,
        cigaretteButtsLotResults: lots.results,
        cigaretteButtsLotsSummary: lots.summary,
      },
      actionPhase: "post_action_complete",
      wasteKg: null,
    } as TerrainInput,
  };
}

function countsFor(lots: ReturnType<typeof aggregateCigaretteButtsLots>) {
  const result = buildImpactTerrain2026PublicResultsFromActions([
    actionFromLots(lots).metadata,
  ]);
  return Object.fromEntries(
    result.buttsByCondition.map((entry) => [entry.condition, entry.count]),
  );
}

describe("public cigarette-butt condition projection", () => {
  it("preserves three lot conditions and changes only the edited lot", () => {
    const initial = aggregateCigaretteButtsLots([
      { id: "count", source: "count", value: 100, condition: "propre" },
      { id: "mass", source: "mass_kg", value: 0.1, condition: "humide" },
      { id: "volume", source: "volume_l", value: 0.5, condition: "mouille" },
    ]);
    expect(countsFor(initial)).toEqual({ propre: 100, humide: 200, mouille: 350 });

    const edited = aggregateCigaretteButtsLots([
      { id: "count", source: "count", value: 100, condition: "propre" },
      { id: "mass", source: "mass_kg", value: 0.2, condition: "humide" },
    ]);
    expect(countsFor(edited)).toEqual({ propre: 100, humide: 400 });
    expect(edited.summary.totalCount).toBe(500);
  });

  it("does not invent a state for a legacy ambiguous measurement", () => {
    const result = buildImpactTerrain2026PublicResultsFromActions([{
      cigaretteButts: 300,
      cigaretteButtsMeasurements: null,
      wasteKg: null,
    }]);

    expect(result.buttsTotal).toBe(300);
    expect(result.qualifiedButtsTotal).toBe(0);
    expect(result.buttsByCondition).toEqual([]);
  });
});
