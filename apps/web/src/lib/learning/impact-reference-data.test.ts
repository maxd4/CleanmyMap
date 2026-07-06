import { describe, expect, it } from "vitest";

import { IMPACT_REFERENCE_CATALOG, IMPACT_REFERENCE_QUIZ_QUESTIONS } from "./impact-reference-data.ts";
import { IMPACT_SCOPES, IMPACT_VALUE_SCOPES } from "./impact-reference-types.ts";

function hasSingleCorrectAnswer(question: (typeof IMPACT_REFERENCE_QUIZ_QUESTIONS)[number]): boolean {
  if (!question.options || question.options.length === 0) {
    return false;
  }

  return question.options.filter((option) => option === question.answer).length === 1;
}

describe("impact reference data", () => {
  it("exposes one coherent quiz question per requested comparison", () => {
    expect(IMPACT_REFERENCE_QUIZ_QUESTIONS).toHaveLength(5);
    expect(IMPACT_REFERENCE_QUIZ_QUESTIONS.every(hasSingleCorrectAnswer)).toBe(true);
  });

  it("keeps scope, unit and uncertainty metadata explicit", () => {
    const referenceIds = IMPACT_REFERENCE_QUIZ_QUESTIONS.map((question) => question.reference?.referenceId);

    expect(referenceIds).toEqual([
      "food-vs-flight",
      "ev-vs-thermal-lifecycle",
      "territorial-co2-per-capita",
      "ai-equivalence",
      "hdi-vs-emissions",
    ]);

    for (const question of IMPACT_REFERENCE_QUIZ_QUESTIONS) {
      const reference = question.reference;

      expect(reference).toBeDefined();
      expect(reference?.title.length ?? 0).toBeGreaterThan(0);
      expect(reference?.yearLabel.length ?? 0).toBeGreaterThan(0);
      expect(reference?.scopeLabel.length ?? 0).toBeGreaterThan(0);
      expect(reference?.orderOfMagnitude.length ?? 0).toBeGreaterThan(0);
      expect(reference?.range.length ?? 0).toBeGreaterThan(0);
      expect(reference?.sources.length ?? 0).toBeGreaterThan(0);
      expect(reference?.values.length ?? 0).toBeGreaterThan(0);
      expect(["faible", "moyenne", "élevée", "très élevée"]).toContain(reference?.uncertainty);
    }
  });

  it("uses the canonical emission scopes when the data is about emissions", () => {
    expect(IMPACT_SCOPES).toEqual(["territorial", "consumption", "usage-only", "cycle-of-life"]);
    expect(IMPACT_VALUE_SCOPES).toContain("human-development");

    const scopes = IMPACT_REFERENCE_QUIZ_QUESTIONS.flatMap((question) => question.reference?.values ?? []).map((value) => value.scope);
    expect(scopes.every((scope) => !scope || IMPACT_VALUE_SCOPES.includes(scope))).toBe(true);
  });

  it("keeps the territorial per-capita ranking coherent", () => {
    const territorial = IMPACT_REFERENCE_CATALOG.territorialPerCapita.values;
    const ordered = [...territorial].sort((left, right) => right.value - left.value);

    expect(ordered.map((value) => value.label)).toEqual(["Qatar", "États-Unis", "Chine", "France", "Inde"]);
    expect(ordered[0].value).toBeCloseTo(41.27118, 5);
    expect(ordered.at(-1)?.value).toBeCloseTo(2.2009783, 5);
  });

  it("keeps the AI reference explicitly uncertain and token-dependent", () => {
    const aiReference = IMPACT_REFERENCE_CATALOG.aiEquivalence;

    expect(aiReference.uncertainty).toBe("très élevée");
    expect(aiReference.note).toContain("tokens");
    expect(aiReference.note).toContain("cache");
    expect(aiReference.note).toContain("mix électrique");
    expect(aiReference.sources.map((source) => source.label)).toEqual(
      expect.arrayContaining([
        "IEA - Energy and AI, executive summary",
        "Jegham et al. - How Hungry is AI? Benchmarking Energy, Water, and Carbon Footprint of LLM Inference",
        "Jin et al. - The Energy Cost of Reasoning",
      ]),
    );
  });
});
