import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HarvestMegotsSection } from "./harvest-megots-section";

function renderMegots(overrides: Partial<React.ComponentProps<typeof HarvestMegotsSection>> = {}) {
  return renderToStaticMarkup(
    React.createElement(HarvestMegotsSection, {
      wasteMegotsKg: "1.2",
      cigaretteButtsVolumeLiters: "",
      wasteMegotsCondition: "propre",
      cigaretteButtsCount: "",
      megotsKg: 1.2,
      megotsCount: 3000,
      megotsCurrentPerVolunteer: 3000,
      megotsBenchmarkPerVolunteer: 4000,
      megotsBenchmarkSourceCount: 12,
      megotsDeltaPercent: -25,
      megotsComparisonTone: "emerald",
      cigaretteButtsCountProvenance: "weight_converted",
      cigaretteButtsMassProvenance: "measured",
      cigaretteButtsVolumeProvenance: "unknown",
      cigaretteButtsConversionFormulaVersion: "impact-terrain-2026-butts-mass-v1",
      onMegotsWeightChange: () => undefined,
      onMegotsVolumeChange: () => undefined,
      onMegotsCountChange: () => undefined,
      onMegotsConditionChange: () => undefined,
      ...overrides,
    }),
  );
}

describe("HarvestMegotsSection", () => {
  it("keeps a derived quantity distinct from the raw input and preserves provenance", () => {
    const markup = renderMegots();

    expect(markup).toContain('id="harvest-megots-count"');
    expect(markup).toContain('value=""');
    expect(markup).toContain("dérivé par conversion de masse");
    expect(markup).toContain("Provenance : mesuré");
    expect(markup).toContain("Formule : impact-terrain-2026-butts-mass-v1");
    expect(markup).toContain('id="harvest-megots-condition"');
    expect(markup).toContain('data-testid="butts-comparison-visual"');
    expect(markup.match(/data-testid="butts-comparison-visual-icon"/g)).toHaveLength(3);
    expect(markup.indexOf("État des mégots")).toBeLessThan(markup.indexOf("Nombre de mégots"));
    expect(markup.indexOf("Nombre de mégots")).toBeLessThan(markup.indexOf("Masse de mégots"));
    expect(markup.indexOf("Masse de mégots")).toBeLessThan(markup.indexOf("Comparaison visuelle des mégots"));
    expect(markup).not.toContain("Référence moyenne");
  });

  it("does not present an unqualified historical value as measured", () => {
    const markup = renderMegots({
      cigaretteButtsCountProvenance: "unknown",
      cigaretteButtsMassProvenance: "unknown",
      cigaretteButtsVolumeProvenance: "unknown",
    });

    expect(markup).toContain("Provenance : historique conservé, origine non qualifiée");
    expect(markup).not.toContain("Provenance : mesuré");
  });

  it("shows an explicit zero but does not manufacture one for an absent value", () => {
    const zeroMarkup = renderMegots({
      wasteMegotsKg: "0",
      cigaretteButtsCount: "0",
      megotsKg: 0,
      megotsCount: 0,
      megotsCurrentPerVolunteer: 0,
      megotsBenchmarkPerVolunteer: 4000,
      megotsBenchmarkSourceCount: 12,
      megotsDeltaPercent: -100,
      megotsComparisonTone: "emerald",
      cigaretteButtsCountProvenance: "counted",
      cigaretteButtsMassProvenance: "measured",
      cigaretteButtsConversionFormulaVersion: null,
    });

    expect(zeroMarkup).toContain("0 mégots");
    expect(zeroMarkup).toContain("0 kg");
    expect(zeroMarkup).not.toContain("Non renseigné");
  });

  it("hides the butts comparison when its reference is unavailable", () => {
    const markup = renderMegots({
      megotsCurrentPerVolunteer: null,
      megotsBenchmarkPerVolunteer: null,
      megotsBenchmarkSourceCount: 0,
      megotsDeltaPercent: null,
    });

    expect(markup).not.toContain('data-testid="butts-comparison-visual"');
  });
});
