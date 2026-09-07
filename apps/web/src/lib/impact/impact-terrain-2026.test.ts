import { describe, expect, it } from "vitest";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import {
  BUTTS_PER_KG_REFERENCE,
  buildImpactTerrain2026Methodology,
  computeImpactTerrain2026Co2Conversions,
  computeImpactTerrain2026WaterConversions,
  CO2_GRAMS_PER_CAR_KILOMETER,
  CO2_GRAMS_PER_PARIS_NEW_YORK_FLIGHT,
  FRENCH_PERSON_ANNUAL_WATER_LITERS,
  OLYMPIC_POOL_LITERS,
  PARIS_MOSCOW_ROAD_DISTANCE_KM,
  computeImpactTerrain2026StreetCleaningSavings,
  STREET_CLEANING_EUROS_PER_WASTE_KG,
  VOLUNTEER_ACTION_EUROS_PER_HOUR,
  WATER_LITERS_PER_CIGARETTE_BUTT,
} from "./impact-terrain-2026";

describe("Impact terrain 2026 methodology domain", () => {
  it("defines the six homepage KPIs through one shared semantic contract", () => {
    const methodology = buildImpactTerrain2026Methodology();

    expect(methodology.kpis).toHaveLength(6);
    expect(methodology.kpis.map((kpi) => kpi.key)).toEqual([
      "wasteKg",
      "butts",
      "volunteers",
      "co2",
      "water",
      "euro",
    ]);
    expect(new Set(methodology.kpis.map((kpi) => kpi.key)).size).toBe(6);
    expect(methodology.semanticLayers).toHaveLength(5);

    for (const kpi of methodology.kpis) {
      expect(kpi.semantics.terrainData.fr).toBeTruthy();
      expect(kpi.semantics.aggregation.fr).toBeTruthy();
      expect(kpi.semantics.result.fr).toBeTruthy();
      expect(kpi.semantics.pedagogicalConversion.fr).toBeTruthy();
      expect(kpi.formula.fr).toBeTruthy();
      expect(kpi.assumptions.length).toBeGreaterThan(0);
      expect(kpi.references.length).toBeGreaterThan(0);
      expect(kpi.limits.length).toBeGreaterThan(0);
    }
  });

  it("uses the configured runtime factors instead of duplicating proxy constants", () => {
    const methodology = buildImpactTerrain2026Methodology();
    const byKey = Object.fromEntries(
      methodology.kpis.map((kpi) => [kpi.key, kpi]),
    );

    expect(BUTTS_PER_KG_REFERENCE).toBe(2_500);
    expect(byKey.co2?.formula.fr).toContain(
      String(IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg),
    );
    expect(byKey.water?.formula.fr).toContain(
      String(IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt),
    );
    expect(byKey.euro?.formula.fr).toContain(
      String(IMPACT_PROXY_CONFIG.factors.euroSavedPerWasteKg),
    );
    expect(byKey.wasteKg?.formula.fr).toContain(
      String(BUTTS_PER_KG_REFERENCE),
    );
  });

  it("keeps the pedagogical conversion constants in one domain source", () => {
    expect(CO2_GRAMS_PER_CAR_KILOMETER).toBe(142);
    expect(CO2_GRAMS_PER_PARIS_NEW_YORK_FLIGHT).toBe(1_000_000);
    expect(PARIS_MOSCOW_ROAD_DISTANCE_KM).toBe(2_840);
    expect(WATER_LITERS_PER_CIGARETTE_BUTT).toBe(500);
    expect(OLYMPIC_POOL_LITERS).toBe(2_500_000);
    expect(FRENCH_PERSON_ANNUAL_WATER_LITERS).toBe(55_000);

    expect(computeImpactTerrain2026Co2Conversions(10).co2eGrams).toBe(12_000);
    expect(computeImpactTerrain2026WaterConversions(1_000).waterLiters).toBe(
      500_000,
    );

    const methodology = buildImpactTerrain2026Methodology();
    const byKey = Object.fromEntries(
      methodology.kpis.map((kpi) => [kpi.key, kpi]),
    );
    expect(byKey.co2?.formula.fr).toContain("CO₂_g = CO₂e_kg × 1 000");
    expect(byKey.water?.formula.fr).toContain("piscines = eau_L / 2500000");
    expect(byKey.euro?.formula.fr).toContain("heures_action = somme(durationMinutes) / 60");
    expect(byKey.euro?.formula.fr).toContain("economie_min = min");
    expect(byKey.euro?.references.map((reference) => reference.fr).join(" ")).toContain(
      "12,31 €/h",
    );
  });

  it("calculates the two independent street-cleaning valuations and their range", () => {
    const result = computeImpactTerrain2026StreetCleaningSavings({
      wasteKg: 10,
      durationMinutes: 90,
    });

    expect(STREET_CLEANING_EUROS_PER_WASTE_KG).toBe(1.5);
    expect(VOLUNTEER_ACTION_EUROS_PER_HOUR).toBe(12.31);
    expect(result).toEqual({
      wasteKg: 10,
      durationMinutes: 90,
      actionHours: 1.5,
      massEstimateEuros: 15,
      timeEstimateEuros: 18.465,
      lowerBoundEuros: 15,
      upperBoundEuros: 18.465,
    });
    expect(
      computeImpactTerrain2026StreetCleaningSavings({
        wasteKg: 0,
        durationMinutes: 0,
      }).upperBoundEuros,
    ).toBe(0);
  });
});
