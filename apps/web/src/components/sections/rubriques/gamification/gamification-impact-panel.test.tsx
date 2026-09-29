import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MeResponse } from "./gamification-types";
import { GamificationImpactPanel } from "./gamification-impact-panel";

function progression(impact: Partial<MeResponse["progression"]["impact"]> = {}): MeResponse["progression"] {
  return {
    impact: {
      waterSavedLiters: 0,
      co2AvoidedKg: 0,
      surfaceCleanedM2: 0,
      ...impact,
    },
    impactMethodology: {
      proxyVersion: "impact-proxy-test",
      qualityRulesVersion: "quality-test",
      scope: "Actions approuvées uniquement.",
      pollutionScoreAverage: 0,
      formulas: [],
      approximations: ["Facteurs versionnés."],
      hypotheses: ["Données terrain disponibles."],
      errorMargins: {
        waterSavedLitersPct: 35,
        co2AvoidedKgPct: 30,
        surfaceCleanedM2Pct: 40,
        pollutionScoreMeanPoints: 10,
      },
    },
  } as unknown as MeResponse["progression"];
}

function render(impact: Partial<MeResponse["progression"]["impact"]> = {}) {
  return renderToStaticMarkup(
    <GamificationImpactPanel
      progression={progression(impact)}
      loading={false}
      error={undefined}
      locale="fr"
    />,
  );
}

describe("GamificationImpactPanel", () => {
  it("renders available impact values as explicitly qualified proxies", () => {
    const markup = render({
      waterSavedLiters: 1200,
      co2AvoidedKg: 4.5,
      surfaceCleanedM2: 18,
      wasteKnownActions: 2,
      wasteCoverageRate: 66.7,
    });

    expect(markup).toContain("Eau préservée — proxy");
    expect(markup).toContain("CO₂e évité — proxy");
    expect(markup).toContain("Surface estimée — proxy");
    expect(markup).toContain("1 200 L");
    expect(markup).toContain("66,7 %");
    expect(markup).toContain("Estimations calculées à partir des données terrain");
    expect(markup).toContain('href="/methodologie#indicateurs-impact-terrain"');
  });

  it("keeps zero as a valid value and reports unavailable coverage as NA", () => {
    const markup = render({ waterSavedLiters: 0, co2AvoidedKg: 0, surfaceCleanedM2: 0 });

    expect(markup).toContain("0 L");
    expect(markup).toContain("0 kg");
    expect(markup).toContain("0 m²");
    expect(markup).toContain("NA — couverture indisponible");
  });

  it("does not duplicate scientific formulas in the UI owner", () => {
    const source = readFileSync(new URL("./gamification-impact-panel.tsx", import.meta.url), "utf8");

    expect(source).not.toContain("computeActionImpactKpis");
    expect(source).not.toContain("waterLitersPerCigaretteButt");
    expect(source).not.toContain("co2KgPerWasteKg");
    expect(source).not.toContain("surfaceM2PerWasteKg");
  });

  it("has explicit loading and error states", () => {
    const loading = renderToStaticMarkup(
      <GamificationImpactPanel progression={undefined} loading error={undefined} locale="fr" />,
    );
    const error = renderToStaticMarkup(
      <GamificationImpactPanel progression={undefined} loading={false} error={new Error("offline")} locale="fr" />,
    );

    expect(loading).toContain("Chargement de l&#x27;impact personnel");
    expect(error).toContain("Impact personnel");
  });
});
