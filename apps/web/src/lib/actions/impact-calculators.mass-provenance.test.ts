import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "./contracts/contract-model";
import {
  computeActionImpactKpis,
  sumActionImpactKpis,
} from "./impact-calculators";
import {
  aggregateCigaretteButtsLots,
  normalizeCigaretteButtsMeasurements,
  type ActionCigaretteButtsMeasurements,
} from "@/lib/waste/cigarette-butts";

function makeContract(
  overrides: Partial<Parameters<typeof buildActionDataContract>[0]> = {},
) {
  return buildActionDataContract({
    id: "mass-provenance-test",
    type: "action",
    status: "approved",
    source: "test",
    observedAt: "2026-08-25",
    locationLabel: "Lieu de test",
    latitude: 48.85,
    longitude: 2.35,
    ...overrides,
  });
}

function unknownCountLot(): ActionCigaretteButtsMeasurements {
  return {
    cigaretteButtsMassKg: null,
    cigaretteButtsMassProvenance: "unknown",
    cigaretteButtsLotResults: [{
      id: "historical-count",
      source: "count",
      value: 1_000,
      condition: "propre",
      count: 1_000,
      massKg: null,
      rawMassKg: null,
      rawVolumeLiters: null,
      countProvenance: "counted",
      massProvenance: "unknown",
      massConversionFormulaVersion: "historical-unknown",
      volumeConversionFormulaVersion: null,
    }],
  } as ActionCigaretteButtsMeasurements;
}

describe("cigarette-butt mass provenance across impact consumers", () => {
  it("keeps an incomplete persisted snapshot unknown in KPI and totals", () => {
    const aggregate = aggregateCigaretteButtsLots([
      {
        id: "measured",
        source: "mass_kg",
        value: 1,
        condition: "propre",
      },
      {
        id: "counted",
        source: "count",
        value: 1_000,
        condition: "propre",
      },
    ]);
    const incomplete = normalizeCigaretteButtsMeasurements({
      cigaretteButtsLots: aggregate.lots,
      cigaretteButtsLotResults: [aggregate.results[0]!],
      cigaretteButtsLotsSummary: aggregate.summary,
    });

    expect(incomplete.cigaretteButtsMassProvenance).toBe("unknown");
    expect(computeActionImpactKpis(makeContract({
      cigaretteButts: aggregate.summary.totalCount,
      cigaretteButtsMeasurements: incomplete,
    }))).toMatchObject({
      buttsMassKg: aggregate.summary.totalMassKg,
      buttsMassProvenance: "unknown",
    });
    expect(sumActionImpactKpis([makeContract({
      cigaretteButts: aggregate.summary.totalCount,
      cigaretteButtsMeasurements: incomplete,
    })])).toMatchObject({
      buttsMassKg: null,
      buttsMassProvenance: "unknown",
    });
  });

  it("does not present a total as measured when a persisted result has null mass", () => {
    const aggregate = aggregateCigaretteButtsLots([{
      id: "counted",
      source: "count",
      value: 1_000,
      condition: "propre",
    }]);
    const unknownResult = {
      ...aggregate.results[0]!,
      massKg: null,
      massProvenance: "unknown" as const,
    };
    const measurements = normalizeCigaretteButtsMeasurements({
      cigaretteButtsLots: aggregate.lots,
      cigaretteButtsLotResults: [unknownResult],
      cigaretteButtsLotsSummary: aggregate.summary,
    });

    expect(computeActionImpactKpis(makeContract({
      cigaretteButts: aggregate.summary.totalCount,
      cigaretteButtsMeasurements: measurements,
    }))).toMatchObject({
      buttsMassKg: aggregate.summary.totalMassKg,
      buttsMassProvenance: "unknown",
    });
  });

  it("rejects an incompatible persisted result instead of trusting its provenance", () => {
    const aggregate = aggregateCigaretteButtsLots([{
      id: "measured",
      source: "mass_kg",
      value: 1,
      condition: "propre",
    }]);
    const incompatible = normalizeCigaretteButtsMeasurements({
      cigaretteButtsLots: aggregate.lots,
      cigaretteButtsLotResults: [{
        ...aggregate.results[0]!,
        id: "different-lot",
        source: "count",
        massProvenance: "measured",
      }],
      cigaretteButtsLotsSummary: aggregate.summary,
    });

    expect(computeActionImpactKpis(makeContract({
      cigaretteButts: aggregate.summary.totalCount,
      cigaretteButtsMeasurements: incompatible,
    })).buttsMassProvenance).toBe("unknown");
  });

  it("keeps an unavailable historical lot mass unknown", () => {
    expect(computeActionImpactKpis(makeContract({
      cigaretteButts: 1_000,
      cigaretteButtsMeasurements: unknownCountLot(),
    }))).toMatchObject({
      buttsMassKg: null,
      buttsMassProvenance: "unknown",
    });
  });

  it("does not infer measured mass without declared provenance", () => {
    expect(computeActionImpactKpis(makeContract({
      cigaretteButts: 1_000,
      cigaretteButtsMeasurements: {
        cigaretteButtsMassKg: 1,
      } as ActionCigaretteButtsMeasurements,
    })).buttsMassProvenance).toBe("unknown");
  });

  it("keeps unknown mass in the aggregate of measured and estimated actions", () => {
    const measured = normalizeCigaretteButtsMeasurements({
      cigaretteButtsLots: [{
        id: "measured",
        source: "mass_kg",
        value: 1,
        condition: "propre",
      }],
    });
    const estimated = normalizeCigaretteButtsMeasurements({
      cigaretteButtsLots: [{
        id: "estimated",
        source: "count",
        value: 1_000,
        condition: "propre",
      }],
    });

    expect(sumActionImpactKpis([
      makeContract({ cigaretteButtsMeasurements: measured }),
      makeContract({ cigaretteButtsMeasurements: estimated }),
      makeContract({ cigaretteButtsMeasurements: unknownCountLot() }),
    ])).toMatchObject({
      buttsMassKg: null,
      buttsMassProvenance: "unknown",
    });
  });
});
