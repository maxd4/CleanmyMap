import { describe, expect, it } from "vitest";
import type { ParisPressureUrbanMorphology } from "./paris-pressure-contract";
import type { ParisPressureRiskContribution } from "./paris-pressure-risk-contract";
import { applyUrbanMorphologyPrior } from "./urban-morphology-prior";

const source = {
  family: "geography" as const,
  publisher: "Test geography",
  dataset: "Test urban morphology",
  url: "https://example.test/morphology",
  license: "Licence de test",
  datasetVersion: "2026-test",
  observedAt: "2026-09-08",
  refreshedAt: "2026-09-08T00:00:00.000Z",
  geographicLevel: "iris" as const,
  status: "available" as const,
  notes: [],
};

function morphology(
  features: Partial<ParisPressureUrbanMorphology["features"]>,
  confidence = 0.9,
): ParisPressureUrbanMorphology {
  return {
    source,
    confidence,
    features: {
      lowTrafficLocalStreet: null,
      deadEnd: null,
      parkInterior: null,
      residentialLowFlow: null,
      parkEntrance: null,
      parkEdge: null,
      parkAmenity: null,
      foodService: null,
      stationProximity: null,
      commerceProximity: null,
      schoolProximity: null,
      terraceProximity: null,
      touristProximity: null,
      ...features,
    },
  };
}

function contribution(
  key: ParisPressureRiskContribution["key"],
  normalized: number,
): ParisPressureRiskContribution {
  return {
    key,
    label: key,
    normalized,
    weight: 0.1,
    points: normalized * 10,
    available: true,
    sourceFamilies: [],
    sourceReliability: 1,
  };
}

describe("urban morphology prior", () => {
  it("réduit un prior de voie calme sans le confondre avec une observation de propreté", () => {
    const result = applyUrbanMorphologyPrior({
      kind: "waste",
      morphology: morphology({ lowTrafficLocalStreet: 1 }),
      beforeRisk: 60,
      contributions: [],
      eventPressure: null,
    });

    expect(result.status).toBe("applied");
    expect(result.appliedMalusPoints).toBeGreaterThan(0);
    expect(result.afterRisk).toBeLessThan(result.beforeRisk);
    expect(result.afterRisk).toBeGreaterThanOrEqual(0);
    expect(result.explanation).not.toMatch(/propre/i);
  });

  it("différencie une avenue sans prior d'une petite voie calme", () => {
    const avenue = applyUrbanMorphologyPrior({
      kind: "waste",
      morphology: morphology({}),
      beforeRisk: 60,
      contributions: [],
      eventPressure: null,
    });
    const quietStreet = applyUrbanMorphologyPrior({
      kind: "waste",
      morphology: morphology({ lowTrafficLocalStreet: 1 }),
      beforeRisk: 60,
      contributions: [],
      eventPressure: null,
    });
    expect(quietStreet.appliedMalusPoints).toBeGreaterThan(avenue.appliedMalusPoints);
  });

  it("réduit séparément les déchets et les mégots", () => {
    const morphologyValue = morphology({ lowTrafficLocalStreet: 1 });
    const waste = applyUrbanMorphologyPrior({
      kind: "waste",
      morphology: morphologyValue,
      beforeRisk: 60,
      contributions: [],
      eventPressure: null,
    });
    const butts = applyUrbanMorphologyPrior({
      kind: "cigaretteButts",
      morphology: morphologyValue,
      beforeRisk: 60,
      contributions: [],
      eventPressure: null,
    });
    expect(waste.appliedMalusPoints).toBeGreaterThan(butts.appliedMalusPoints);
  });

  it("compense un cul-de-sac proche d'une station par le signal de fréquentation", () => {
    const result = applyUrbanMorphologyPrior({
      kind: "waste",
      morphology: morphology({ deadEnd: 1, stationProximity: 0.1 }),
      beforeRisk: 60,
      contributions: [contribution("stationPressure", 0.9)],
      eventPressure: null,
    });
    expect(result.baseMalusPoints).toBeGreaterThan(0);
    expect(result.appliedMalusPoints).toBe(0);
    expect(result.compensatingSignals).toContain("signal de fréquentation robuste");
  });

  it("atténue l'intérieur d'un parc près d'une entrée ou d'un équipement", () => {
    const interior = applyUrbanMorphologyPrior({
      kind: "waste",
      morphology: morphology({ parkInterior: 1 }),
      beforeRisk: 60,
      contributions: [],
      eventPressure: null,
    });
    const amenity = applyUrbanMorphologyPrior({
      kind: "waste",
      morphology: morphology({ parkInterior: 1, parkAmenity: 1 }),
      beforeRisk: 60,
      contributions: [],
      eventPressure: null,
    });
    expect(interior.appliedMalusPoints).toBeGreaterThan(amenity.appliedMalusPoints);

    const entrance = applyUrbanMorphologyPrior({
      kind: "waste",
      morphology: morphology({ parkInterior: 1, parkEntrance: 1 }),
      beforeRisk: 60,
      contributions: [],
      eventPressure: null,
    });
    const foodService = applyUrbanMorphologyPrior({
      kind: "waste",
      morphology: morphology({ parkInterior: 1, foodService: 1 }),
      beforeRisk: 60,
      contributions: [],
      eventPressure: null,
    });
    expect(entrance.appliedMalusPoints).toBe(0);
    expect(foodService.appliedMalusPoints).toBe(0);
  });

  it("annule le malus morphologique lorsqu'un événement récent est fort", () => {
    const result = applyUrbanMorphologyPrior({
      kind: "waste",
      morphology: morphology({ parkInterior: 1 }),
      beforeRisk: 60,
      contributions: [],
      eventPressure: 1,
    });
    expect(result.appliedMalusPoints).toBe(0);
    expect(result.explanation).toContain("événement récent");
  });

  it("annule le malus dans une zone portant un historique validé", () => {
    const result = applyUrbanMorphologyPrior({
      kind: "cigaretteButts",
      morphology: morphology({ lowTrafficLocalStreet: 1 }),
      beforeRisk: 60,
      contributions: [contribution("validatedCigarettePressure", 0.8)],
      eventPressure: null,
    });
    expect(result.appliedMalusPoints).toBe(0);
    expect(result.compensatingSignals).toContain("historique local validé");
  });

  it("reste borné, déterministe et sans correction avec une confiance faible", () => {
    const input = {
      kind: "waste" as const,
      morphology: morphology(
        {
          lowTrafficLocalStreet: 5,
          deadEnd: -1,
          parkInterior: 2,
        },
        0.2,
      ),
      beforeRisk: 120,
      contributions: [],
      eventPressure: null,
    };
    const first = applyUrbanMorphologyPrior(input);
    expect(first).toEqual(applyUrbanMorphologyPrior(input));
    expect(first.status).toBe("low_confidence");
    expect(first.appliedMalusPoints).toBe(0);
    expect(first.afterRisk).toBe(100);
    expect(first.confidence).toBe(0.2);
  });
});
