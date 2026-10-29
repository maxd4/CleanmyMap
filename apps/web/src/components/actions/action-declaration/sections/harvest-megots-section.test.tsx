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
      cigaretteButtsCountProvenance: "weight_converted",
      cigaretteButtsMassProvenance: "measured",
      cigaretteButtsConversionFormulaVersion: "cigarette-butts-mass-v1",
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
    expect(markup).toContain("Formule : cigarette-butts-mass-v1");
    expect(markup).not.toContain("Référence moyenne");
  });

  it("shows an explicit zero but does not manufacture one for an absent value", () => {
    const zeroMarkup = renderMegots({
      wasteMegotsKg: "0",
      cigaretteButtsCount: "0",
      megotsKg: 0,
      megotsCount: 0,
      cigaretteButtsCountProvenance: "counted",
      cigaretteButtsMassProvenance: "measured",
      cigaretteButtsConversionFormulaVersion: null,
    });

    expect(zeroMarkup).toContain("0 mégots");
    expect(zeroMarkup).toContain("0 kg");
    expect(zeroMarkup).not.toContain("Non renseigné");
  });
});
