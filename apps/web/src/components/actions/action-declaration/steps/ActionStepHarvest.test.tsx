import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { createInitialFormState } from "../payload";
import { ActionStepHarvest } from "./ActionStepHarvest";

function renderHarvest(mode: "essentials" | "details") {
  const form = createInitialFormState("Aperçu local", "action");
  form.wasteKg = "0";
  form.cigaretteButtsCount = "0";
  form.wasteMegotsKg = "0";
  return renderToStaticMarkup(
    React.createElement(ActionStepHarvest, {
      mode,
      form,
      updateField: () => undefined,
      recordType: "action",
      photoAssets: [],
      visionEstimate: null,
      visionStatus: "idle",
      heuristicEstimatedWasteKg: 0,
      estimatedWasteKg: 0,
      estimatedWasteKgInterval: null,
      estimatedWasteKgConfidence: null,
      wasteSuggestionSource: "heuristic",
      onPhotoUpload: () => undefined,
      onClearPhotos: () => undefined,
    } as ComponentProps<typeof ActionStepHarvest>),
  );
}

describe("ActionStepHarvest compact modes", () => {
  it("keeps the three essential measurements visible and preserves an explicit zero", () => {
    const html = renderHarvest("essentials");

    expect(html).toContain("Déchets hors mégots (kg)");
    expect(html).toContain("Nombre de mégots");
    expect(html).toContain("Masse de mégots (kg)");
    expect(html).not.toContain('id="harvest-megots-volume"');
  });

  it("keeps secondary harvest controls out of the always-visible mode", () => {
    const html = renderHarvest("details");

    expect(html).toContain('id="harvest-megots-volume"');
    expect(html).not.toContain('id="harvest-megots-count"');
    expect(html).not.toContain('id="harvest-waste-kg"');
  });
});
