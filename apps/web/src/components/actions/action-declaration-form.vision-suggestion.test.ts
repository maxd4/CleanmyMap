import { describe, expect, it } from "vitest";
import { resolveWasteSuggestion } from "./action-declaration-form.vision-suggestion";

describe("resolveWasteSuggestion", () => {
  it("uses the vision estimate when confidence is high enough", () => {
    const suggestion = resolveWasteSuggestion({
      heuristicEstimateKg: 6.2,
      visionEstimate: {
        modelVersion: "heuristic-v1",
        source: "hybrid",
        provisional: true,
        bagsCount: { value: 2, confidence: 0.8 },
        fillLevel: { value: 80, confidence: 0.74 },
        density: { value: "humide_dense", confidence: 0.7 },
        wasteKg: { value: 9.4, confidence: 0.77, interval: [8.5, 10.1] },
      },
    });

    expect(suggestion.source).toBe("vision");
    expect(suggestion.estimatedWasteKg).toBe(9.4);
    expect(suggestion.estimatedWasteKgInterval).toEqual([8.5, 10.1]);
    expect(suggestion.estimatedWasteKgConfidence).toBe(0.77);
  });

  it("keeps heuristic fallback when confidence is low", () => {
    const suggestion = resolveWasteSuggestion({
      heuristicEstimateKg: 6.2,
      visionEstimate: {
        modelVersion: "heuristic-v1",
        source: "heuristic",
        provisional: true,
        bagsCount: { value: 1, confidence: 0.5 },
        fillLevel: { value: 60, confidence: 0.48 },
        density: { value: "sec", confidence: 0.45 },
        wasteKg: { value: 8.2, confidence: 0.41, interval: [6.7, 9.8] },
      },
    });

    expect(suggestion.source).toBe("heuristic");
    expect(suggestion.estimatedWasteKg).toBe(6.2);
    expect(suggestion.estimatedWasteKgInterval).toEqual([6.7, 9.8]);
    expect(suggestion.estimatedWasteKgConfidence).toBe(0.41);
  });

  it("returns heuristic values when there is no vision estimate", () => {
    const suggestion = resolveWasteSuggestion({
      heuristicEstimateKg: 4.1,
      visionEstimate: null,
    });

    expect(suggestion.source).toBe("heuristic");
    expect(suggestion.estimatedWasteKg).toBe(4.1);
    expect(suggestion.estimatedWasteKgInterval).toBeNull();
    expect(suggestion.estimatedWasteKgConfidence).toBeNull();
  });
});
