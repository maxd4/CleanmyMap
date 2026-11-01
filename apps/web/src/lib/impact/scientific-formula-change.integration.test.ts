import { describe, expect, it } from "vitest";
import {
  buildPublicImpactCalculationFromActions,
} from "./public-impact-kpis";
import {
  buildPublicImpactSnapshotPayload,
  PUBLIC_IMPACT_SNAPSHOT_VERSION,
} from "./public-impact-snapshot";
import { PUBLIC_IMPACT_PROJECTION_VERSION } from "./scientific-projection-versions";
import {
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
} from "./impact-terrain-2026";
import {
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION,
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
  aggregateCigaretteButtsLots,
} from "@/lib/waste/cigarette-butts";
import {
  toIndividualImpactMeasurement,
} from "@/lib/actions/participation/individual-impact";
import { buildMohsThresholdAwards } from "@/lib/gamification/mohs-progression";
import {
  deriveContextualCollectionUnits,
  isCurrentActionCollectionReferenceAverage,
  normalizeActionCollectionReferenceAverageRow,
} from "@/lib/actions/action-collection-reference-averages";

const SOURCE_LOTS = [
  { id: "direct-count", source: "count" as const, value: 100, condition: "propre" as const },
  { id: "weighed", source: "mass_kg" as const, value: 1, condition: "humide" as const },
  { id: "volumetric", source: "volume_l" as const, value: 3, condition: "mouille" as const },
];

function buildIndividualRow(historical: ReturnType<typeof aggregateCigaretteButtsLots>) {
  return {
    individual_cigarette_butts_count: historical.summary.totalCount,
    individual_cigarette_butts_mass_kg: historical.summary.totalMassKg,
    individual_cigarette_butts_condition: null,
    individual_cigarette_butts_provenance: "derived",
    individual_cigarette_butts_conversion_version: CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
    individual_cigarette_butts_lots: historical,
    individual_impact_measured_by: "organizer",
    individual_impact_measured_at: "2026-10-01T10:00:00.000Z",
  };
}

describe("scientific formula change transverse integration", () => {
  it("recalculates only the volume lot and converges action, public and individual projections once", () => {
    const historical = aggregateCigaretteButtsLots(SOURCE_LOTS, {
      volumeConversionVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
    });
    const current = aggregateCigaretteButtsLots(SOURCE_LOTS);

    expect(current.lots).toEqual(historical.lots);
    expect(current.results.slice(0, 2)).toEqual(historical.results.slice(0, 2));
    expect(current.results[2]?.count).toBe(2_100);
    expect(historical.results[2]?.count).toBe(1_800);
    expect(current.summary.totalCount).toBe(4_200);
    expect(historical.summary.totalCount).toBe(3_900);
    expect(current.summary.totalCount - historical.summary.totalCount).toBe(300);
    expect(current.summary.totalCount).toBe(
      current.results.reduce((total, lot) => total + lot.count, 0),
    );

    const historicalAction = buildPublicImpactCalculationFromActions([{
      metadata: {
        cigaretteButts: historical.summary.totalCount,
        cigaretteButtsMeasurements: {
          cigaretteButtsCount: historical.summary.totalCount,
          cigaretteButtsMassKg: historical.summary.totalMassKg,
          cigaretteButtsVolumeLiters: historical.summary.totalVolumeLiters,
          cigaretteButtsCondition: null,
          cigaretteButtsCountProvenance: "estimated",
          cigaretteButtsMassProvenance: "estimated",
          cigaretteButtsVolumeProvenance: "measured",
          cigaretteButtsConversionFormulaVersion: null,
          cigaretteButtsLots: historical.lots,
          cigaretteButtsLotResults: historical.results,
          cigaretteButtsLotsSummary: historical.summary,
        },
        actionPhase: "post_action_complete",
        wasteKg: null,
      },
    }]);
    const currentAction = buildPublicImpactCalculationFromActions([{
      metadata: {
        cigaretteButts: current.summary.totalCount,
        cigaretteButtsMeasurements: {
          cigaretteButtsCount: current.summary.totalCount,
          cigaretteButtsMassKg: current.summary.totalMassKg,
          cigaretteButtsVolumeLiters: current.summary.totalVolumeLiters,
          cigaretteButtsCondition: null,
          cigaretteButtsCountProvenance: "estimated",
          cigaretteButtsMassProvenance: "estimated",
          cigaretteButtsVolumeProvenance: "measured",
          cigaretteButtsConversionFormulaVersion: null,
          cigaretteButtsLots: current.lots,
          cigaretteButtsLotResults: current.results,
          cigaretteButtsLotsSummary: current.summary,
        },
        actionPhase: "post_action_complete",
        wasteKg: null,
      },
    }]);
    expect(historicalAction.impactTerrain.buttsTotal).toBe(historical.summary.totalCount);
    expect(currentAction.impactTerrain.buttsTotal).toBe(current.summary.totalCount);
    expect(deriveContextualCollectionUnits({
      actionContext: "citizen",
      childrenCount: 2,
      adultCount: 3,
      retiredCount: 1,
    })).toEqual({ wasteUnits: 4.5, buttsUnits: 4.5 });
    const currentReference = normalizeActionCollectionReferenceAverageRow({
      waste_per_volunteer: null,
      butts_per_volunteer: current.summary.totalCount,
      waste_source_count: 0,
      butts_source_count: 1,
      eligible_action_count: 1,
      formula_version: "action-collection-reference-averages-v1",
      updated_at: "2026-11-01T00:00:00.000Z",
    });
    expect(isCurrentActionCollectionReferenceAverage(currentReference)).toBe(true);

    const ordinaryIndividual = toIndividualImpactMeasurement(buildIndividualRow(historical));
    const recalculatedIndividual = toIndividualImpactMeasurement(
      buildIndividualRow(historical),
      { recalculateDerived: true },
    );
    expect(ordinaryIndividual?.comparableButtsCount).toBe(3_900);
    expect(recalculatedIndividual?.comparableButtsCount).toBe(4_200);
    expect(recalculatedIndividual?.cigaretteButtsLots?.results[0]?.count).toBe(100);
    expect(recalculatedIndividual?.cigaretteButtsLots?.results[1]?.count).toBe(2_000);
    expect(recalculatedIndividual?.cigaretteButtsLots?.results[2]?.volumeConversionFormulaVersion).toBe(
      CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION,
    );

    const historicalAwards = buildMohsThresholdAwards([{
      occurredOn: "2026-10-01",
      wasteValue: null,
      buttsValue: historical.summary.totalCount,
    }]);
    const currentAwards = buildMohsThresholdAwards([{
      occurredOn: "2026-10-01",
      wasteValue: null,
      buttsValue: current.summary.totalCount,
    }]);
    expect(currentAwards.length).toBeGreaterThan(historicalAwards.length);
    expect(currentAwards.filter((award) => award.family === "butts").at(-1)?.sourceId).toBe(
      "mohs:butts:grade:3",
    );

    const snapshot = buildPublicImpactSnapshotPayload({
      aggregate: {
        visible_actions: 1,
        distinct_locations: 1,
        waste_kg: null,
        waste_source_count: 0,
        cigarette_butts: current.summary.totalCount,
        volunteers: 1,
        participants_total: 1,
        total_duration_minutes: 30,
        action_distribution: [],
        classification_warnings: [],
        butts_by_condition: [],
        methodology_version: PUBLIC_IMPACT_PROJECTION_VERSION,
      },
      generatedAt: "2026-11-01T00:00:00.000Z",
      floorDate: "2026-01-01",
    });
    expect(snapshot.projectionVersion).toBe(PUBLIC_IMPACT_PROJECTION_VERSION);
    expect(PUBLIC_IMPACT_SNAPSHOT_VERSION).toContain("v4");
    expect(JSON.stringify(snapshot)).not.toMatch(/user|email|participant_id/i);
  });

  it("keeps a legacy ambiguous value and a historical snapshot outside the current recalculation", () => {
    const legacy = toIndividualImpactMeasurement({
      individual_cigarette_butts_count: 1_700,
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_condition: null,
      individual_cigarette_butts_provenance: "unknown",
      individual_cigarette_butts_conversion_version: null,
    }, { recalculateDerived: true });

    expect(legacy?.comparableButtsCount).toBe(1_700);
    expect(legacy?.cigaretteButtsMassKg).toBe(1);
    expect(legacy?.cigaretteButtsConversionVersion).toBeNull();
    expect(PUBLIC_IMPACT_SNAPSHOT_VERSION).not.toBe("impact-terrain-public-2026.09-v3-null-coverage");
  });
});
