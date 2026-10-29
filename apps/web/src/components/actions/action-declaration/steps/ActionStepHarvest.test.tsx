import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { createInitialFormState } from "../payload";
import { ActionStepHarvest } from "./ActionStepHarvest";

function renderHarvest(mode: "essentials" | "collection" | "details") {
  const form = createInitialFormState("Aperçu local", "action");
  form.wasteKg = "0";
  form.cigaretteButtsCount = "0";
  form.wasteMegotsKg = "0";
  return renderToStaticMarkup(
    React.createElement(ActionStepHarvest, {
      mode,
      form,
      updateField: () => undefined,
      updateFields: () => undefined,
      recordType: "action",
      photoAssets: [],
      visionEstimate: null,
      visionStatus: "idle",
      photoError: null,
      estimatedWasteKgInterval: null,
      onPhotoUpload: () => undefined,
      onPhotoReplace: () => undefined,
      onRemovePhoto: () => undefined,
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
    expect(html).toContain('value="0"');
    expect(html).not.toContain('id="harvest-megots-volume"');
    expect(html).not.toContain("kg moyen");
    expect(html).not.toContain("Référence moyenne");
  });

  it("keeps secondary harvest controls out of the always-visible mode", () => {
    const html = renderHarvest("details");

    expect(html).toContain('id="harvest-megots-volume"');
    expect(html).not.toContain('id="harvest-megots-count"');
    expect(html).not.toContain('id="harvest-waste-kg"');
  });

  it("does not duplicate essential measurements in the collection details", () => {
    const html = renderHarvest("collection");

    expect(html).toContain('id="harvest-megots-volume"');
    expect(html).not.toContain('id="harvest-megots-count"');
    expect(html).not.toContain('id="harvest-megots-kg"');
    expect(html).not.toContain('id="harvest-waste-kg"');
  });
});
