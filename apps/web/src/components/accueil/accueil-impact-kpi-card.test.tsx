import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { computeImpactTerrain2026StreetCleaningSavings } from "@/lib/impact/impact-terrain-2026";
import { buildImpactTerrain2026PublicResults } from "@/lib/impact/impact-terrain-2026-results";
import type { HomeImpactSnapshot, HomeMetric } from "@/lib/accueil/config";
import {
  HomeImpactKpiCard,
  shouldOpenTooltipOnFocus,
  shouldToggleTooltipOnClick,
} from "./accueil-impact-kpi-card";

const metric: HomeMetric = {
  key: "co2",
  label: "CO₂ évité",
  value: "6,7 kg",
  category: "Équivalent",
  accent: "emerald",
};

const participantsMetric: HomeMetric = {
  key: "volunteers",
  label: "Bénévoles mobilisés",
  value: "12",
  category: "Résultat",
  accent: "blue",
};

const snapshot: HomeImpactSnapshot = {
  participantsTotal: 0,
  actionDistribution: [],
  impactTerrain: buildImpactTerrain2026PublicResults({ wasteKg: 55 }),
  streetCleaningSavings: computeImpactTerrain2026StreetCleaningSavings({
    wasteKg: 55,
    durationMinutes: 120,
  }),
};

describe("HomeImpactKpiCard", () => {
  it("keeps mouse clicks hover-driven while allowing touch and pen toggles", () => {
    expect(shouldToggleTooltipOnClick("mouse", 1)).toBe(false);
    expect(shouldToggleTooltipOnClick("touch", 1)).toBe(true);
    expect(shouldToggleTooltipOnClick("pen", 1)).toBe(true);
    expect(shouldToggleTooltipOnClick(null, 0)).toBe(false);
  });

  it("opens on keyboard/programmatic focus but not pointer focus", () => {
    expect(shouldOpenTooltipOnFocus(null)).toBe(true);
    expect(shouldOpenTooltipOnFocus("mouse")).toBe(false);
    expect(shouldOpenTooltipOnFocus("touch")).toBe(false);
  });
  it("consumes canonical tooltip results and keeps the accessible info control", () => {
    const html = renderToStaticMarkup(
      <HomeImpactKpiCard
        metric={metric}
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
        impactSnapshot={null}
      />,
    );

    expect(html).not.toContain("km en voiture thermique");
    expect(html).not.toContain("voyages Paris");
  });

  it("renders the canonical action distribution for the participant bubble", () => {
    const html = renderToStaticMarkup(
      <HomeImpactKpiCard
        metric={participantsMetric}
        impactSnapshot={{
          ...snapshot,
          participantsTotal: 12,
          actionDistribution: [
            { key: "association", category: "Association", count: 1 },
            {
              key: "student_association",
              category: "Association étudiante",
              count: 2,
            },
            { key: "other", category: "Autres", count: 0 },
          ],
        }}
      />,
    );

    expect(html).toContain('role="img"');
    expect(html).toContain("3 actions");
    expect(html).toContain("Association étudiante");
    expect(html).not.toContain(">Autres<");
    expect(html).not.toContain("participants par action");
  });
});
