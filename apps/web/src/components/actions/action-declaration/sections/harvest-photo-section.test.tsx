import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ActionPhotoAsset, ActionVisionEstimate } from "@/lib/actions/types";
import { HarvestPhotoSection } from "./harvest-photo-section";

const photo = {
  id: "photo-1",
  name: "bilan.jpg",
  mimeType: "image/jpeg",
  dataUrl: "data:image/jpeg;base64,AAA",
  size: 42_000,
  width: 1200,
  height: 900,
} satisfies ActionPhotoAsset;

const visionEstimate = {
  modelVersion: "vision-hybrid-v1",
  source: "hybrid",
  provisional: true,
  bagsCount: { value: 2, confidence: 0.9, interval: [1, 3] },
  fillLevel: { value: 60, confidence: 0.8, interval: [45, 75] },
  density: { value: "humide_dense", confidence: 0.7, interval: null },
  wasteKg: { value: 3.4, confidence: 0.9, interval: [2.2, 4.8] },
} satisfies ActionVisionEstimate;

describe("HarvestPhotoSection", () => {
  it("documents the disabled state before any photo is selected", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HarvestPhotoSection, {
        photoAssets: [],
        visionEstimate: null,
        visionStatus: "idle",
        estimatedWasteKgInterval: null,
        hasPhotos: false,
        onPhotoUpload: () => undefined,
        onClearPhotos: () => undefined,
      }),
    );

    expect(markup).toContain('data-testid="vision-estimation-disabled"');
    expect(markup).toContain("Estimation photo désactivée");
  });

  it("keeps photos visible while the immature photo estimation stays disabled", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HarvestPhotoSection, {
        photoAssets: [photo],
        visionEstimate,
        visionStatus: "ready",
        estimatedWasteKgInterval: [2.2, 4.8],
        hasPhotos: true,
        onPhotoUpload: () => undefined,
        onClearPhotos: () => undefined,
      }),
    );

    expect(markup).toContain('alt="Photo 1"');
    expect(markup).toContain('data-testid="vision-estimation-disabled"');
    expect(markup).toContain("Estimation photo désactivée");
    expect(markup).toContain("pas encore suffisamment mature ni validé");
    expect(markup).not.toContain("Proxy expérimental non validé");
    expect(markup).not.toContain("Poids proposé");
    expect(markup).not.toContain("Intervalle heuristique");
    expect(markup).not.toContain("Estimation IA");
    expect(markup).not.toContain("confiance du modèle");
    expect(markup).not.toContain("vision-hybrid-v1");
  });
});
