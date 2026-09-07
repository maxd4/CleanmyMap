import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { computeImpactTerrain2026StreetCleaningSavings } from "@/lib/impact/impact-terrain-2026";
import { buildImpactTerrain2026PublicResults } from "@/lib/impact/impact-terrain-2026-results";
import type { HomeImpactSnapshot, HomeMetric } from "@/lib/accueil/config";
import { HomeImpactKpiCard } from "./accueil-impact-kpi-card";

const metric: HomeMetric = {
  key: "co2",
  label: "CO₂ évité",
  value: "6,7 kg",
  category: "Équivalent",
  accent: "emerald",
};

const snapshot: HomeImpactSnapshot = {
  impactTerrain: buildImpactTerrain2026PublicResults({ wasteKg: 55 }),
  streetCleaningSavings: computeImpactTerrain2026StreetCleaningSavings({
    wasteKg: 55,
    durationMinutes: 120,
  }),
};

describe("HomeImpactKpiCard", () => {
  it("consumes canonical tooltip results and keeps the accessible info control", () => {
    const html = renderToStaticMarkup(
      <HomeImpactKpiCard
        metric={metric}
        counters={{
          wasteKg: 55,
          butts: 0,
          volunteers: 0,
          co2AvoidedKg: 6.7,
          waterSavedLiters: 0,
          euroSaved: 0,
        }}
        actionCount={0}
        impactSnapshot={snapshot}
      />,
    );

    expect(html).toContain("464,8 km en voiture thermique");
    expect(html).toContain('aria-controls="impact-tooltip-co2"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("Afficher la méthode de calcul pour CO₂ évité");
    expect(html).not.toContain("0,025");
    expect(html).not.toContain("1 000 000");
  });

  it("does not expose fabricated equivalences without a snapshot", () => {
    const html = renderToStaticMarkup(
      <HomeImpactKpiCard
        metric={metric}
        counters={{
          wasteKg: 55,
          butts: 0,
          volunteers: 0,
          co2AvoidedKg: 6.7,
          waterSavedLiters: 0,
          euroSaved: 0,
        }}
        actionCount={0}
        impactSnapshot={null}
      />,
    );

    expect(html).not.toContain("km en voiture thermique");
    expect(html).not.toContain("voyages Paris");
  });
});
