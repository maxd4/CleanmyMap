import { describe, expect, it } from "vitest";

import {
  QUIZ_QUESTION_FORMATS,
  getQuizQuestionFormat,
  listQuizQuestionFormatIds,
} from "./quiz-question-formats";

describe("quiz-question-formats", () => {
  it("defines the first pedagogical formats with concrete objectives", () => {
    expect(listQuizQuestionFormatIds()).toEqual([
      "vrai-faux-piegeux",
      "situations-terrain",
      "comparaisons",
      "classements",
      "estimations",
    ]);
    expect(QUIZ_QUESTION_FORMATS).toHaveLength(5);
    expect(getQuizQuestionFormat("vrai-faux-piegeux").objective).toContain("idées reçues");
    expect(getQuizQuestionFormat("situations-terrain").benefits).toContain("Teste le bon geste en contexte");
    expect(getQuizQuestionFormat("comparaisons").avoid.length).toBeGreaterThan(0);
    expect(getQuizQuestionFormat("classements").objective).toContain("Ordonner");
    expect(getQuizQuestionFormat("estimations").objective).toContain("ordres de grandeur");
  });
});
