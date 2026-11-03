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
    expect(markup).toContain("Statut : estimé");
    expect(markup).toContain("Statut : mesuré");
    expect(markup).not.toContain("Formule :");
    expect(markup).toContain('id="harvest-megots-condition"');
    expect(markup).toContain('data-testid="butts-measurement-visual"');
    expect(markup.match(/data-testid="butts-measurement-visual-icon"/g)).toHaveLength(3);
    expect(markup).toContain('data-testid="butts-comparison-visual"');
    expect(markup).not.toContain('data-testid="butts-comparison-visual-icon"');
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

    expect(markup).toContain("Statut : non qualifié");
    expect(markup).not.toContain("Statut : mesuré");
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
      megotsKg: null,
      megotsCount: null,
      megotsCurrentPerVolunteer: null,
      megotsBenchmarkPerVolunteer: null,
      megotsBenchmarkSourceCount: 0,
      megotsDeltaPercent: null,
    });

    expect(markup).toContain('data-testid="butts-measurement-visual"');
    expect(markup.match(/data-fill-percent="0"/g)).toHaveLength(3);
    expect(markup).not.toContain('data-testid="butts-comparison-visual"');
    expect(markup).not.toContain("Référence insuffisante");
  });

  it("renders explicit multi-lot sources and counted/estimated totals", () => {
    const markup = renderMegots({
      megotsLots: [
        { id: "counted", source: "count", value: "100", condition: "propre" },
        { id: "volume", source: "volume_l", value: "0.5", condition: "humide" },
      ],
      megotsCounted: 100,
      megotsEstimated: 300,
      megotsMeasuredMassKg: 0,
      megotsEstimatedMassKg: 0.24,
      onAddMegotsLot: () => undefined,
      onUpdateMegotsLot: () => undefined,
      onRemoveMegotsLot: () => undefined,
      onMoveMegotsLot: () => undefined,
    });

    expect(markup).toContain("Une mesure source par lot");
    expect(markup).toContain("100 comptés");
    expect(markup).toContain("300 estimés");
    expect(markup).not.toContain("mégots/L");
    expect(markup).toContain('data-testid="megots-lot-counted"');
    expect(markup).toContain('data-testid="megots-lot-volume"');
  });
});
