import { describe, expect, it } from "vitest";

import {
  QUIZ_QUESTION_FORMATS,
  getQuizQuestionFormat,
  listQuizQuestionFormatIds,
} from "./quiz-question-formats";

describe("quiz-question-formats", () => {
  it("defines the full pedagogical format catalog with concrete objectives", () => {
    expect(listQuizQuestionFormatIds()).toEqual([
      "vrai-faux-piegeux",
      "situations-terrain",
      "comparaisons",
      "classements",
      "estimations",
      "consequences-indirectes",
      "questions-contre-intuitives",
      "mini-enquetes",
      "cas-limites",
      "mythes-et-realites",
    ]);
    expect(QUIZ_QUESTION_FORMATS).toHaveLength(10);
    expect(getQuizQuestionFormat("vrai-faux-piegeux").objective).toContain("idées reçues");
    expect(getQuizQuestionFormat("situations-terrain").benefits).toContain("Ancre la pédagogie dans le réel");
    expect(getQuizQuestionFormat("comparaisons").avoid.length).toBeGreaterThan(0);
    expect(getQuizQuestionFormat("classements").objective).toContain("Ordonner");
    expect(getQuizQuestionFormat("estimations").objective).toContain("ordres de grandeur");
    expect(getQuizQuestionFormat("consequences-indirectes").objective).toContain("effets cachés");
    expect(getQuizQuestionFormat("questions-contre-intuitives").benefits).toContain("Génère un fort effet de surprise");
    expect(getQuizQuestionFormat("mini-enquetes").objective).toContain("meilleure explication");
    expect(getQuizQuestionFormat("cas-limites").avoid).toContain("L'ambiguïté pour l'ambiguïté sans valeur pédagogique");
    expect(getQuizQuestionFormat("mythes-et-realites").objective).toContain("partiellement correcte");
  });
});
