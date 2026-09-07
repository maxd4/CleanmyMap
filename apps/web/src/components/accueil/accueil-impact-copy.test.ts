import { describe, expect, it } from "vitest";
import { computeImpactTerrain2026StreetCleaningSavings } from "@/lib/impact/impact-terrain-2026";
import { buildImpactTerrain2026PublicResults } from "@/lib/impact/impact-terrain-2026-results";
import { buildImpactInsight } from "./accueil-impact-copy";

const counters = {
  wasteKg: 55,
  butts: 13_875,
  volunteers: 65,
  co2AvoidedKg: 6.7,
  waterSavedLiters: 6_937_500,
  euroSaved: 8,
};

const impactSnapshot = {
  impactTerrain: buildImpactTerrain2026PublicResults({
    wasteKg: 55,
    buttsTotal: 13_875,
    qualifiedButtsByCondition: { propre: 13_875 },
  }),
  streetCleaningSavings: computeImpactTerrain2026StreetCleaningSavings({
    wasteKg: 55,
    durationMinutes: 120,
  }),
};

describe("buildImpactInsight", () => {
  it("explains waste with bag and bicycle equivalents", () => {
    expect(buildImpactInsight("wasteKg", counters, 5, impactSnapshot).lines).toEqual([
      "≈ 11 sacs poubelle de 50 L",
      "≈ 2,8 Vélib'",
    ]);
  });

  it("converts cigarette butts to distance and weight", () => {
    const insight = buildImpactInsight("butts", counters, 5, impactSnapshot);

    expect(insight.lines).toEqual([
      "≈ 346,9 m de mégots alignés",
      "≈ 5,6 kg de mégots",
    ]);
  });

  it("keeps collective action participation explicit", () => {
    expect(buildImpactInsight("volunteers", counters, 5).lines[1]).toBe(
      "≈ 13 participants par action collective",
    );
  });

  it("uses the requested carbon reference points", () => {
    expect(buildImpactInsight("co2", counters, 5, impactSnapshot).lines).toEqual([
      "≈ 464,8 km en voiture thermique, soit 0,16 voyages Paris–Moscou",
      "≈ 0,07 voyages Paris–New York en avion",
    ]);
  });

  it("uses the requested water references", () => {
    expect(buildImpactInsight("water", counters, 5, impactSnapshot).lines).toEqual([
      "≈ 2,78 piscines olympiques",
      "≈ 126,14 années de consommation d'eau d'un Français moyen",
    ]);
  });

  it("uses the persisted road-value range without rebuilding either estimate", () => {
    expect(buildImpactInsight("euro", counters, 5, impactSnapshot).lines).toEqual([
      "24,62 à 82,5 € économisés grâce au temps d'action bénévole et aux déchets retirés",
    ]);
  });

  it("does not fabricate equivalences when the canonical snapshot is absent", () => {
    for (const key of ["wasteKg", "butts", "co2", "water", "euro"]) {
      expect(buildImpactInsight(key, counters, 5, null).lines).toEqual([]);
    }
    expect(buildImpactInsight("euro", counters, 5, undefined).lines).toEqual([]);
  });
});
