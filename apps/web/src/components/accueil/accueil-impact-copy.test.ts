import { describe, expect, it } from "vitest";
import { buildImpactInsight } from "./accueil-impact-copy";

const counters = {
  wasteKg: 55,
  butts: 13_875,
  volunteers: 65,
  co2AvoidedKg: 6.7,
  waterSavedLiters: 6_937_500,
  euroSaved: 8,
};

describe("buildImpactInsight", () => {
  it("explains waste with bag and bicycle equivalents", () => {
    expect(buildImpactInsight("wasteKg", counters, 5).lines).toEqual([
      "≈ 11 sacs de ramassage de 50 L",
      "≈ 3,7 vélos mécaniques",
    ]);
  });

  it("converts cigarette butts to distance and weight", () => {
    const insight = buildImpactInsight("butts", counters, 5);

    expect(insight.lines).toEqual([
      "Mis bout à bout : ≈ 346,9 m",
      "Soit ≈ 0,04 % d'un Paris–Marseille",
      "Poids cumulé : ≈ 2,8 kg",
    ]);
  });

  it("keeps collective action participation explicit", () => {
    expect(buildImpactInsight("volunteers", counters, 5).lines[1]).toBe(
      "≈ 13 participants par action collective",
    );
  });

  it("uses the requested carbon reference points", () => {
    expect(buildImpactInsight("co2", counters, 5).lines).toEqual([
      "≈ 47,2 km en voiture thermique évités",
      "≈ 0,02 trajet Paris–Moscou",
      "≈ 0,67 % d'un vol Paris–New York",
    ]);
  });

  it("uses the requested water references", () => {
    expect(buildImpactInsight("water", counters, 5).lines).toEqual([
      "≈ 2,78 piscines olympiques",
      "≈ 126,1 années de consommation",
    ]);
  });

  it("keeps the road-cost formula visible", () => {
    expect(buildImpactInsight("euro", counters, 5).lines[1]).toBe(
      "Calcul : heures d'action cumulées × 11,92 €",
    );
  });
});
