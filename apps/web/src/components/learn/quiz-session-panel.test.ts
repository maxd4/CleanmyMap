import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QuizSessionPanel } from "./quiz-session-panel";
import { QUIZ_REVIEW_TARGETS } from "./quiz-review-targets";
import type { QuizQuestion, QuizSessionSummary } from "./environmental-quiz";

describe("QuizSessionPanel", () => {
  it("renders an explanation and a review destination for the correction", () => {
    const question: QuizQuestion = {
      id: "test-tri-1",
      type: "multiple-choice",
      category: "tri-recyclage",
      question: "Que faire d'un emballage propre et vide quand la consigne locale ne dit rien d'autre ?",
      answer: "Le mettre dans la filière de tri des emballages",
      options: [
        "Le mettre dans la filière de tri des emballages",
        "Le jeter au compost",
        "Le mettre avec le verre",
        "Le laisser de côté",
      ],
      explanation:
        "Un emballage propre et vide suit généralement la filière des emballages. En cas de doute local, on vérifie la consigne avant d'improviser.",
      review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
      reasoningType: "terrain",
    };

    const markup = renderToStaticMarkup(
      React.createElement(QuizSessionPanel, {
        locale: "fr",
        question,
        questionIndex: 0,
        totalQuestions: 1,
        currentQuestionState: null,
        currentQuestionReviewDate: "Aujourd'hui",
        currentQuestionStreak: 0,
        currentQuestionMasteryLevel: 0,
        selectedOption: "Le jeter au compost",
        showAnswer: true,
        lastCheckResult: false,
        score: 0,
        shouldOfferMiniChallenge: false,
        nextReasoningType: null,
        hasReviewedToday: false,
        onSelectOption: () => undefined,
        onCheckAnswer: () => undefined,
        onNextQuestion: () => undefined,
        onResetQuiz: () => undefined,
        onStartMiniChallenge: () => undefined,
        onHandleSRSUpdate: () => undefined,
      }),
    );

    expect(markup).toContain("Réponse attendue");
    expect(markup).toContain("Pourquoi ?");
    expect(markup).toContain("À revoir dans");
    expect(markup).toContain("Bonnes pratiques");
    expect(markup).toContain("/learn/bonnes-pratiques");
    expect(markup).toContain("Un emballage propre et vide suit généralement la filière des emballages");
    expect(markup).toContain("Votre réponse : Le jeter au compost");
  });

  it("renders a true-false question as a piégeux Vrai / Faux prompt", () => {
    const question: QuizQuestion = {
      id: "tf-1",
      type: "true-false",
      category: "climat-biodiversite",
      question:
        "Une bouteille plastique abandonnée dans la nature disparaît complètement au bout de quelques siècles.",
      answer: "Faux",
      options: ["Vrai", "Faux"],
      explanation:
        "Elle ne disparaît pas complètement: elle se fragmente souvent en microplastiques et persiste dans l'environnement.",
      review: QUIZ_REVIEW_TARGETS.comprendre,
      reasoningType: "idée reçue",
    };

    const markup = renderToStaticMarkup(
      React.createElement(QuizSessionPanel, {
        locale: "fr",
        question,
        questionIndex: 0,
        totalQuestions: 1,
        currentQuestionState: null,
        currentQuestionReviewDate: "Aujourd'hui",
        currentQuestionStreak: 0,
        currentQuestionMasteryLevel: 0,
        selectedOption: "Vrai",
        showAnswer: false,
        lastCheckResult: null,
        score: 0,
        shouldOfferMiniChallenge: false,
        nextReasoningType: null,
        hasReviewedToday: false,
        onSelectOption: () => undefined,
        onCheckAnswer: () => undefined,
        onNextQuestion: () => undefined,
        onResetQuiz: () => undefined,
        onStartMiniChallenge: () => undefined,
        onHandleSRSUpdate: () => undefined,
      }),
    );

    expect(markup).toContain("Vrai / Faux");
    expect(markup).toContain("Une bouteille plastique abandonnée dans la nature disparaît complètement au bout de quelques siècles.");
    expect(markup).toContain("Vrai");
    expect(markup).toContain("Faux");
  });

  it("renders a closing session summary with targeted reprise and theme status", () => {
    const question: QuizQuestion = {
      id: "summary-v1",
      type: "multiple-choice",
      category: "impact-methodologie",
      question: "Pourquoi commence-t-on souvent par le contexte avant de donner un chiffre ?",
      answer: "Pour éviter de faire dire trop au chiffre",
      options: [
        "Pour éviter de faire dire trop au chiffre",
        "Pour faire paraître le chiffre plus scientifique",
        "Pour cacher les limites de la méthode",
        "Pour rallonger le texte sans valeur ajoutée",
      ],
      explanation:
        "Un chiffre isolé peut sembler énorme ou minuscule sans référence. Le contexte fixe l'échelle, la comparaison utile et la limite de lecture.",
      review: QUIZ_REVIEW_TARGETS.comprendre,
      reasoningType: "questions contre-intuitives",
    };

    const sessionSummary: QuizSessionSummary = {
      score: 5,
      totalQuestions: 6,
      totalAnswered: 6,
      themesSucceeded: [
        { label: "Comprendre", href: "/learn/comprendre", total: 3, correct: 3, accuracy: 1 },
      ],
      themesToReview: [
        {
          label: "Bonnes pratiques",
          href: "/learn/bonnes-pratiques",
          total: 3,
          correct: 2,
          accuracy: 0.66,
        },
      ],
      nextReviewTarget: {
        label: "Bonnes pratiques",
        href: "/learn/bonnes-pratiques",
      },
    };

    const markup = renderToStaticMarkup(
      React.createElement(QuizSessionPanel, {
        locale: "fr",
        question,
        questionIndex: 5,
        totalQuestions: 6,
        currentQuestionState: null,
        currentQuestionReviewDate: "Aujourd'hui",
        currentQuestionStreak: 0,
        currentQuestionMasteryLevel: 0,
        selectedOption: "",
        showAnswer: false,
        lastCheckResult: null,
        score: 5,
        shouldOfferMiniChallenge: false,
        nextReasoningType: null,
        hasReviewedToday: false,
        sessionSummary,
        onSelectOption: () => undefined,
        onCheckAnswer: () => undefined,
        onNextQuestion: () => undefined,
        onResetQuiz: () => undefined,
        onStartMiniChallenge: () => undefined,
        onHandleSRSUpdate: () => undefined,
      }),
    );

    expect(markup).toContain("Bilan de session");
    expect(markup).toContain("5/6");
    expect(markup).toContain("83%");
    expect(markup).toContain("Thèmes réussis");
    expect(markup).toContain("Comprendre");
    expect(markup).toContain("À retravailler");
    expect(markup).toContain("Bonnes pratiques");
    expect(markup).toContain("Revoir la rubrique");
    expect(markup).toContain("/learn/bonnes-pratiques");
  });
});
