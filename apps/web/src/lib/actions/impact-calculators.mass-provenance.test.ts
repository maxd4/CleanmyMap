import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "./contracts/contract-model";
import {
  computeActionImpactKpis,
  sumActionImpactKpis,
} from "./impact-calculators";
import {
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
