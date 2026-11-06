// @vitest-environment jsdom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionMegotsCondition } from "@/lib/actions/types";
import { HarvestMegotsSection } from "./harvest-megots-section";

const DEFAULT_MEGOTS_PROPS: React.ComponentProps<typeof HarvestMegotsSection> = {
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
  cigaretteButtsInputSource: "mass",
  cigaretteButtsConversionFormulaVersion: "impact-terrain-2026-butts-mass-v1",
  onMegotsWeightChange: () => undefined,
  onMegotsVolumeChange: () => undefined,
  onMegotsCountChange: () => undefined,
  onMegotsConditionChange: () => undefined,
};

function createMegotsElement(overrides: Partial<React.ComponentProps<typeof HarvestMegotsSection>> = {}) {
  return React.createElement(HarvestMegotsSection, {
    ...DEFAULT_MEGOTS_PROPS,
    ...overrides,
  });
}

function renderMegots(overrides: Partial<React.ComponentProps<typeof HarvestMegotsSection>> = {}) {
  return renderToStaticMarkup(createMegotsElement(overrides));
}

function InteractiveMegots() {
  const [condition, setCondition] = React.useState<ActionMegotsCondition>("propre");
  return createMegotsElement({
    wasteMegotsCondition: condition,
    onMegotsConditionChange: setCondition,
  });
}

describe("HarvestMegotsSection", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    document.body.replaceChildren();
  });

  it("keeps the canonical values in a native radio group", () => {
    const markup = renderMegots();

    expect(markup).toContain('id="harvest-megots-condition"');
    expect(markup).not.toContain('role="radiogroup"');
    expect(markup).not.toContain('role="radio"');
    expect(markup.match(/type="radio"/g)).toHaveLength(3);
    expect(markup.match(/name="harvest-megots-condition"/g)).toHaveLength(3);
    expect(markup).toContain('value="propre"');
    expect(markup).toContain('value="humide"');
    expect(markup).toContain('value="mouille"');
    expect(markup).toContain("Sec / Propre");
    expect(markup).toContain("Humide");
    expect(markup).toContain("Mouillé");
  });

  it("selects with a click, exposes focus and preserves the measured mass", () => {
    act(() => {
      root = createRoot(container);
      root.render(<InteractiveMegots />);
    });

    const radios = () => [...container.querySelectorAll<HTMLInputElement>("input[type=radio]")];
    const mass = () => container.querySelector<HTMLInputElement>("#harvest-megots-kg");

    expect(radios()).toHaveLength(3);
    expect(radios().find((radio) => radio.checked)?.value).toBe("propre");
    expect(mass()?.value).toBe("1.2");

    act(() => radios()[1]?.click());
    expect(radios().find((radio) => radio.checked)?.value).toBe("humide");
    expect(mass()?.value).toBe("1.2");

    act(() => radios()[1]?.focus());
    expect(document.activeElement).toBe(radios()[1]);
    expect(radios()[1]?.checked).toBe(true);
  });

  it("routes focused keyboard-style radio activation through the existing condition callback", () => {
    const onConditionChange = vi.fn();
    act(() => {
      root = createRoot(container);
      root.render(<HarvestMegotsSection {...DEFAULT_MEGOTS_PROPS} onMegotsConditionChange={onConditionChange} />);
    });

    const radios = [...container.querySelectorAll<HTMLInputElement>("input[type=radio]")];
    act(() => {
      radios[2]?.focus();
      radios[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }));
    });

    expect(document.activeElement).toBe(radios[2]);
    expect(onConditionChange).toHaveBeenCalledWith("mouille");
  });

  it("keeps a derived quantity distinct from the raw input and preserves provenance", () => {
    const markup = renderMegots();

    expect(markup).toContain('id="harvest-megots-count"');
    expect(markup).toContain('value=""');
    expect(markup).toContain("estimé");
    expect(markup).toContain("mesure saisie");
    expect(markup).not.toContain("Formule :");
    expect(markup).toContain('id="harvest-megots-condition"');
    expect(markup).toContain('type="radio"');
    expect(markup).not.toContain('id="harvest-megots-count-slider"');
    expect(markup).toContain('data-testid="butts-measurement-visual"');
    expect(markup.match(/data-testid="butts-measurement-visual-icon"/g)).toHaveLength(1);
    expect(markup).not.toContain("Dernière mesure saisie");
    expect(markup).toContain(">Masse</span>");
    expect(markup).toContain('id="harvest-megots-volume"');
    expect(markup).toContain('data-testid="butts-comparison-trend"');
    expect(markup).toContain("par rapport à la moyenne par participant");
    expect(markup).not.toContain("unité opérationnelle");
    expect(markup).toContain("source · mesure saisie");
    expect(markup).toContain("estimé");
    expect(markup).toContain("appearance-none");
    expect(markup).toContain("text-base");
    expect(markup).toContain("sm:grid-cols-2");
    expect(markup).toContain("minmax(4rem,auto)");
    expect(markup).not.toContain('data-testid="butts-comparison-visual"');
    expect(markup.indexOf('data-testid="butts-measurement-visual"')).toBeLessThan(markup.indexOf(">Nombre</span>"));
    expect(markup.indexOf(">Nombre</span>")).toBeLessThan(markup.indexOf("État des mégots"));
    expect(markup).not.toContain("Référence moyenne");
  });
  it("does not present an unqualified historical value as measured", () => {
    const markup = renderMegots({
      cigaretteButtsCountProvenance: "unknown",
      cigaretteButtsMassProvenance: "unknown",
      cigaretteButtsVolumeProvenance: "unknown",
    });

    expect(markup).toContain("non qualifié");
    expect(markup).not.toContain("mesuré");
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
    expect(zeroMarkup).toContain('id="harvest-megots-kg"');
    expect(zeroMarkup).toContain('value="0"');
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
    expect(markup.match(/data-fill-percent="0"/g)).toHaveLength(1);
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
    expect(markup).not.toContain('id="harvest-megots-count-slider"');
    expect(markup).toContain('readOnly=""');
    expect(markup).toContain("modifiez les contributions dans la zone ci-dessous");
  });
});
