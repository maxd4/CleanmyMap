import { describe, expect, it, vi } from "vitest";

const compressImageFileMock = vi.hoisted(() => vi.fn());
const readBlobAsDataUrlMock = vi.hoisted(() => vi.fn());
const readImageDimensionsMock = vi.hoisted(() => vi.fn());
const createClientIdentifierMock = vi.hoisted(() => vi.fn(() => "photo-id"));

vi.mock("@/lib/media/image-compression", () => ({
  compressImageFile: compressImageFileMock,
  readBlobAsDataUrl: readBlobAsDataUrlMock,
  readImageDimensions: readImageDimensionsMock,
}));
vi.mock("@/lib/client-identifier", () => ({
  createClientIdentifier: createClientIdentifierMock,
}));

import {
  estimateVisionFromStats,
  inferActionVisionEstimate,
  normalizeActionPhotos,
  type ActionPhotoAnalysis,
} from "./vision";

const context = {
  locationLabel: "Paris",
  arrivalLocationLabel: "Jardin du test",
  volunteersCount: 4,
  durationMinutes: 30,
};

function stats(overrides: Partial<ActionPhotoAnalysis> = {}): ActionPhotoAnalysis {
  return {
    brightness: 0.4,
    contrast: 0.5,
    saturation: 0.25,
    darkRatio: 0.28,
    warmRatio: 0.2,
    whiteRatio: 0.1,
    edgeDensity: 0.55,
    ...overrides,
  };
}

describe("action vision business projection", () => {
  it("returns a bounded heuristic estimate when no photo is available", () => {
    const result = estimateVisionFromStats([], { locationLabel: "" });

    expect(result.source).toBe("heuristic");
    expect(result.provisional).toBe(true);
    expect(result.bagsCount.value).toBeGreaterThanOrEqual(1);
    expect(result.bagsCount.value).toBeLessThanOrEqual(18);
    expect(result.wasteKg.value).toBeGreaterThanOrEqual(0.1);
    expect(result.wasteKg.interval?.[0]).toBeGreaterThanOrEqual(0);
  });

  it("classifies strong multi-photo evidence as vision and applies place and density rules", () => {
    const result = estimateVisionFromStats(
      [stats({ contrast: 1, edgeDensity: 1, saturation: 0.1, darkRatio: 0.1, warmRatio: 0.05, whiteRatio: 0.6 }), stats({ contrast: 1, edgeDensity: 1, saturation: 0.1, darkRatio: 0.1, warmRatio: 0.05, whiteRatio: 0.6 }), stats({ contrast: 1, edgeDensity: 1, saturation: 0.1, darkRatio: 0.1, warmRatio: 0.05, whiteRatio: 0.6 })],
      { ...context, placeType: "Boulevard central" },
    );

    expect(result.source).toBe("vision");
    expect(result.provisional).toBe(false);
    expect(result.density.value).toBe("sec");
    expect(result.wasteKg.value).toBeGreaterThan(0.1);
    expect(result.density.interval).toBeNull();
  });

  it("keeps one-photo evidence hybrid and respects saturated, dense and park branches", () => {
    const wet = estimateVisionFromStats([stats({ saturation: 0.5, darkRatio: 0.4 })], {
      ...context,
      placeType: "Parc municipal",
    });
    const dense = estimateVisionFromStats([stats({ saturation: 0.25, darkRatio: 0.25, warmRatio: 0.2 })], context);

    expect(wet.source).toBe("hybrid");
    expect(wet.density.value).toBe("mouille");
    expect(dense.density.value).toBe("humide_dense");
    expect(wet.wasteKg.value).toBeGreaterThanOrEqual(0.1);
  });

  it("clamps high estimates and preserves the photo normalization contract", async () => {
    const saturated = estimateVisionFromStats([stats({ darkRatio: 1, edgeDensity: 1, saturation: 1 })], {
      ...context,
      placeType: "Avenue très longue",
    });
    expect(saturated.bagsCount.value).toBe(11);
    expect(saturated.fillLevel.value).toBe(100);
    expect(saturated.wasteKg.value).toBeLessThanOrEqual(150);

    const file = new File(["image"], "source.jpg", { type: "image/jpeg" });
    const prepared = new File(["compressed"], "prepared.webp", { type: "image/webp" });
    compressImageFileMock.mockResolvedValue(prepared);
    readBlobAsDataUrlMock.mockResolvedValue("data:image/webp;base64,test");
    readImageDimensionsMock.mockResolvedValue({ width: 800, height: 600 });

    const assets = await normalizeActionPhotos([file, file, file, file]);
    expect(assets).toHaveLength(3);
    expect(assets[0]).toMatchObject({ id: "photo-id", mimeType: "image/webp", width: 800, height: 600 });
    expect(compressImageFileMock).toHaveBeenCalledTimes(3);

    readImageDimensionsMock.mockRejectedValueOnce(new Error("dimensions unavailable"));
    const fallback = await normalizeActionPhotos([file]);
    expect(fallback[0]).toMatchObject({ width: null, height: null });
  });

  it("returns a rejected estimate when a photo cannot be decoded", async () => {
    await expect(inferActionVisionEstimate([{ id: "p", name: "p", mimeType: "image/jpeg", size: 1, width: null, height: null, dataUrl: "bad" }], context)).rejects.toThrow();
  });
});
