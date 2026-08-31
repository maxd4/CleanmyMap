import { describe, expect, it } from "vitest";

import type { QuizQuestion } from "@/lib/learning/quiz/quiz-question-contract";
import { QUIZ_REVIEW_TARGETS } from "@/lib/learning/quiz/quiz-review-targets";
import {
  buildQuizSessionPanelModel,
  getAnswerFeedbackBody,
  getAnswerFeedbackTitle,
  getQuestionFormatLabel,
  STATE_TONES,
} from "./quiz-session-panel.model";

const question: QuizQuestion = {
  id: "model-1",
  type: "multiple-select",
  category: "action-terrain",
  question: "Quels objets présentent un risque ?",
  answer: ["Une seringue usagée", "Un verre cassé"],
  options: ["Une seringue usagée", "Un verre cassé", "Une canette vide"],
  explanation: "Le risque concret passe avant la rapidité.",
  reasoningType: "terrain",
  review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
  errorType: "erreur de sécurité",
  feedbackWrong: "La sécurité du geste passe avant le gain de temps.",
  localized: {
    options: {
      fr: ["Une seringue usagée", "Un verre cassé", "Une canette vide"],
    },
  },
  sourceUrl: "https://example.com/source",
};

describe("quiz-session-panel.model", () => {
  it("keeps the question format and state tone mappings explicit", () => {
    expect(getQuestionFormatLabel("flashcard")).toBe("Flashcard");
    expect(getQuestionFormatLabel("true-false")).toBe("Vrai / Faux");
    expect(getQuestionFormatLabel("multiple-select")).toBe("Cases à cocher");
    expect(getQuestionFormatLabel("multiple-choice")).toBe("Choix Multiple");
    expect(STATE_TONES).toEqual({
      new: "cyan",
      failed: "amber",
      due: "violet",
      mastered: "emerald",
    });
  });

  it("derives the correction, follow-ups, localized options and school visibility state", () => {
    const model = buildQuizSessionPanelModel({
      locale: "fr",
      question,
      questionIndex: 2,
      selectedOptions: ["Une seringue usagée"],
      showAnswer: false,
      showChoices: false,
      isSchoolMode: true,
      isCollectiveMode: true,
      lastCheckResult: false,
      nextReasoningType: "estimation",
    });

    expect(model.questionFormatLabel).toBe("Cases à cocher");
    expect(model.progressValue).toBe(3);
    expect(model.nextReasoningTypeLabel).toBe("estimation");
    expect(model.selectedOptionsLabel).toBe("Une seringue usagée");
    expect(model.correctOptionsLabel).toBe("Une seringue usagée, Un verre cassé");
    expect(model.displayOptions).toEqual(question.options);
    expect(model.sourceIsExternal).toBe(true);
    expect(model.shouldHideChoices).toBe(true);
    expect(model.collectiveRevealLabel).toBe("Révéler la bonne réponse");
    expect(model.resolvedErrorType).toBe("erreur de sécurité");
    expect(model.reviewTarget).toEqual(QUIZ_REVIEW_TARGETS.bonnes_pratiques);
    expect(model.reviewTargetFollowUp.href).toBe("/learn/bonnes-pratiques");
    expect(model.errorTargetFollowUp.modeId).toBe("tri-securite");
    expect(model.answerFeedbackTitle).toBe("Réponse incorrecte");
    expect(model.answerFeedbackBody).toBe("La sécurité du geste passe avant le gain de temps.");
  });

  it("preserves the flashcard feedback derivation", () => {
    const flashcard: QuizQuestion = {
      ...question,
      type: "flashcard",
      answer: ["Réponse A", "Réponse B"],
    };

    expect(getAnswerFeedbackTitle(flashcard, null)).toBe("Réponse A, Réponse B");
    expect(getAnswerFeedbackBody(flashcard, null)).toBe(
      "La réponse attendue et la piste de révision sont affichées immédiatement.",
    );
  });
});
