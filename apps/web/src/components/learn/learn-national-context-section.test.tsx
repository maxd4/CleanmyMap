import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GESTES_PROPRES_BAROMETER_2025 } from "@/lib/learning/gestes-propres/gestes-propres-barometer";
import { IFOP_DEPOTS_STUDY } from "@/lib/learning/gestes-propres/ifop-depots-study";
import { getNationalContextMetrics, LearnNationalContextSection } from "./learn-national-context-section";

describe("LearnNationalContextSection", () => {
  it("projects featured metrics from both validated source owners", () => {
    const metrics = getNationalContextMetrics();

    expect(metrics.barometer.map((metric) => metric.id)).toEqual(GESTES_PROPRES_BAROMETER_2025.featuredKpiIds);
    expect(metrics.ifop.map((metric) => metric.id)).toEqual(IFOP_DEPOTS_STUDY.featuredMetricIds);
  });

  it("keeps source, declarative status, limits and real CTAs visible", () => {
    const markup = renderToStaticMarkup(createElement(LearnNationalContextSection, { locale: "fr" }));
    const source = readFileSync(new URL("./learn-national-context-section.tsx", import.meta.url), "utf8");

    expect(markup).toContain("Contexte national");
    expect(markup).toContain("Ce que ces données signifient");
    expect(markup).toContain("Ce que ces données ne permettent pas de conclure");
    expect(markup).toContain("données déclaratives");
    expect(markup).toContain("mesure terrain");
    expect(markup).toContain("Contexte national ≠ données CleanMyMap");
    expect(markup).toContain("/signalement");
    expect(markup).toContain("/learn/bonnes-pratiques/gestespropres-Barometre_2025.pdf");
    expect(markup).toContain("/learn/bonnes-pratiques/gestesprorpe-ifop-depots.pdf");
    expect(markup).toContain('<details data-disclosure-tone="amber" data-disclosure-size="md" class="cmm-disclosure mt-4">');
    expect(markup).toContain('data-disclosure-tone="amber"');
    expect(markup).toContain('data-disclosure-size="md"');
    expect(markup).toContain('<summary class="cmm-disclosure__summary">');
    expect(source).not.toMatch(/<details\b|<summary\b/);
    expect(markup).not.toContain(["1", "M"].join(""));
    expect(markup).not.toContain(["1.2", "Mds"].join(""));
    expect(markup).not.toContain(["32", " kg"].join(""));
    expect(markup).not.toContain(["450", " ans"].join(""));
    expect(markup).not.toContain(["80", "%"].join(""));
    expect(markup).not.toContain(["fetch", "Actions"].join(""));
    expect(markup).not.toContain(["water", "Saved"].join(""));
    expect(markup).not.toContain(["co2", "Avoided"].join(""));
  });
});
