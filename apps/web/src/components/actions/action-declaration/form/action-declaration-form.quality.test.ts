import { describe, expect, it } from "vitest";
import type { ActionPhotoAsset } from "@/lib/actions/types";
import { createInitialFormState } from "../payload";
import { computeActionDataQuality } from "./action-declaration-form.quality";

const proofPhoto = {
  id: "photo-1",
  name: "collecte.jpg",
  mimeType: "image/jpeg",
  size: 1024,
  width: 1200,
  height: 900,
  dataUrl: "data:image/jpeg;base64,fixture",
} satisfies ActionPhotoAsset;

describe("computeActionDataQuality", () => {
  it("keeps a declared measure independent from the indicative estimate", () => {
    const form = {
      ...createInitialFormState("user-1"),
      locationLabel: "Quai de test",
      latitude: "48.85",
      longitude: "2.35",
      wasteKg: "100",
      notes: "Une mesure déclarée volontairement éloignée du repère.",
    };

    const result = computeActionDataQuality({
      form,
      declarationMode: "complete",
      recordType: "action",
      hasLocationProof: true,
      hasDrawingProof: true,
      photoAssets: [proofPhoto],
    });

    expect(result.warnings).toEqual([]);
    expect(result).not.toHaveProperty("score");
    expect(result).not.toHaveProperty("level");
  });

  it("returns concrete re-reading warnings without presenting reliability claims", () => {
    const result = computeActionDataQuality({
      form: createInitialFormState("user-1"),
      declarationMode: "complete",
      recordType: "action",
      hasLocationProof: false,
      hasDrawingProof: false,
      photoAssets: [],
    });

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.join(" ")).not.toMatch(/fiabil|confiance/i);
  });
});
