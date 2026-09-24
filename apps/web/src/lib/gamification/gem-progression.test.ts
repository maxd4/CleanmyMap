import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_GEM_GRADE_DEFINITIONS,
  computeGemProgression,
  type GemGradeDefinition,
} from "./gem-progression";

const config = {
  idPrefix: "test-gem",
  iconVariant: "gem",
  tooltip: (definition: GemGradeDefinition) => definition.label,
};

describe("canonical gem progression", () => {
  it("keeps one threshold source for the imposed scale", () => {
    expect(
      CANONICAL_GEM_GRADE_DEFINITIONS.map(({ label, threshold }) => [
        label,
        threshold,
      ]),
    ).toEqual([
      ["Observateur", 0],
      ["Quartz", 1],
      ["Topaze", 3],
      ["Saphir", 5],
      ["Rubis", 8],
      ["Émeraude", 10],
      ["Diamant", 15],
      ["Opale", 20],
    ]);
  });

  it.each([
    [0, "Observateur", "Quartz", 0],
    [1, "Quartz", "Topaze", 0],
    [2, "Quartz", "Topaze", 50],
    [3, "Topaze", "Saphir", 0],
    [4, "Topaze", "Saphir", 50],
    [5, "Saphir", "Rubis", 0],
    [7, "Saphir", "Rubis", 67],
    [8, "Rubis", "Émeraude", 0],
    [9, "Rubis", "Émeraude", 50],
    [10, "Émeraude", "Diamant", 0],
    [14, "Émeraude", "Diamant", 80],
    [15, "Diamant", "Opale", 0],
    [19, "Diamant", "Opale", 80],
    [20, "Opale", "Pilier II", 0],
    [24, "Opale", "Pilier II", 80],
    [25, "Pilier II", "Pilier III", 0],
    [29, "Pilier II", "Pilier III", 80],
    [30, "Pilier III", "Pilier IV", 0],
    [34, "Pilier III", "Pilier IV", 80],
  ])(
    "%i => %s, then %s at %i%%",
    (value, currentLabel, nextLabel, progressPercent) => {
      const state = computeGemProgression(value, config);

      expect(state.currentLabel).toBe(currentLabel);
      expect(state.nextLabel).toBe(nextLabel);
      expect(state.progressPercent).toBe(progressPercent);
    },
  );

  it("keeps the four gem families on the shared progression algorithm", () => {
    const familySources = [
      new URL("./action-balance.ts", import.meta.url),
      new URL("./monthly-regularity.ts", import.meta.url),
      new URL("./sensitive-zone-badge.ts", import.meta.url),
      new URL("../../components/gamification/infinite-badges/utils.ts", import.meta.url),
    ].map((url) => readFileSync(url, "utf8"));

    for (const source of familySources) {
      expect(source).toContain("computeGemProgression");
      expect(source).not.toMatch(/GEM_GRADES[^=]*=\s*\[/);
      expect(source).not.toContain("buildPilierGrade");
      expect(source).not.toContain("toRomanNumeral");
    }
  });
});
