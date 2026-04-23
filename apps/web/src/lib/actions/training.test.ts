import { describe, expect, it } from "vitest";
import type {
  ActionPhotoAsset,
  ActionVisionEstimate,
} from "@/lib/actions/types";
import { buildTrainingExampleInsert } from "./training";

const photo: ActionPhotoAsset = {
  id: "photo-1",
  name: "capture.jpg",
  mimeType: "image/jpeg",
  size: 128_000,
  width: 1200,
  height: 900,
  dataUrl: "data:image/jpeg;base64,AAA",
};

const visionEstimate: ActionVisionEstimate = {
  modelVersion: "vision-hybrid-v1",
  source: "hybrid",
  provisional: false,
  bagsCount: { value: 3, confidence: 0.84, interval: [2, 4] },
  fillLevel: { value: 72, confidence: 0.79, interval: [58, 86] },
  density: { value: "humide_dense", confidence: 0.73, interval: null },
  wasteKg: { value: 4.2, confidence: 0.84, interval: [3.4, 5.0] },
};

describe("buildTrainingExampleInsert", () => {
  it("serializes the photo-based learning example", () => {
    const insert = buildTrainingExampleInsert({
      actionId: "action-1",
      photos: [photo],
      realWeightKg: 4.6,
      visionEstimate,
      metadata: {
        placeType: "N° Boulevard/Avenue/Place",
      },
    });

    expect(insert).toEqual(
      expect.objectContaining({
        action_id: "action-1",
        poids_reel: 4.6,
        poids_estime: 4.2,
        confiance: 0.84,
        model_version: "vision-hybrid-v1",
        status: "labelled",
      }),
    );
    expect(insert?.metadata).toMatchObject({
      photoCount: 1,
      placeType: "N° Boulevard/Avenue/Place",
    });
  });

  it("skips examples when no photo is available", () => {
    expect(
      buildTrainingExampleInsert({
        actionId: "action-2",
        photos: [],
        realWeightKg: 1.2,
      }),
    ).toBeNull();
  });
});
