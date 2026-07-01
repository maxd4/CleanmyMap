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
      reviewTarget: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
      reasoningType: "terrain",
      errorType: "mauvaise compréhension d'une filière de tri",
      misconception: "La propreté seule ne suffit pas à décider la filière.",
      severity: "medium",
      feedbackCorrect: "Bonne réponse : tu respectes la consigne locale.",
      feedbackWrong: "Erreur pédagogique : la filière locale prime sur l'intuition.",
      takeaway: "La bonne filière dépend d'abord de la consigne locale.",
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
        selectedOptions: [],
        showAnswer: true,
        showChoices: true,
        lastCheckResult: false,
        score: 0,
        shouldOfferMiniChallenge: false,
        nextReasoningType: null,
        hasReviewedToday: false,
        onSelectOption: () => undefined,
        onToggleOption: () => undefined,
        onCheckAnswer: () => undefined,
        onPreviousQuestion: () => undefined,
        onNextQuestion: () => undefined,
        onResetQuiz: () => undefined,
        onStartMiniChallenge: () => undefined,
        onReplayRecommendedMode: () => undefined,
        onHandleSRSUpdate: () => undefined,
      }),
    );

    expect(markup).toContain("Réponse incorrecte");
    expect(markup).toContain("Explication pédagogique");
    expect(markup).toContain("À retenir");
    expect(markup).toContain("Suite utile");
    expect(markup).toContain("La bonne filière dépend d&#x27;abord de la consigne locale.");
    expect(markup).toContain("À revoir dans");
    expect(markup).toContain("Bonnes pratiques");
    expect(markup).toContain("/learn/bonnes-pratiques");
    expect(markup).toContain("/sections/recycling");
    expect(markup).toContain("Revoir la rubrique liée à l&#x27;erreur");
    expect(markup).toContain("Erreur pédagogique");
    expect(markup).toContain("aria-live=\"polite\"");
    expect(markup).toContain("type=\"button\"");
    expect(markup).toContain("mauvaise compréhension d&#x27;une filière de tri");
    expect(markup).toContain("Gravité: medium");
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
        selectedOptions: [],
        showAnswer: false,
        showChoices: true,
        lastCheckResult: null,
        score: 0,
        shouldOfferMiniChallenge: false,
        nextReasoningType: null,
        hasReviewedToday: false,
        onSelectOption: () => undefined,
        onToggleOption: () => undefined,
        onCheckAnswer: () => undefined,
        onPreviousQuestion: () => undefined,
        onNextQuestion: () => undefined,
        onResetQuiz: () => undefined,
        onStartMiniChallenge: () => undefined,
        onReplayRecommendedMode: () => undefined,
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
      reviewTarget: QUIZ_REVIEW_TARGETS.sentrainer,
      reasoningType: "questions contre-intuitives",
      errorType: "raisonnement trop simpliste",
      misconception: "Un seul critère a été survalorisé alors que plusieurs facteurs interagissent.",
      severity: "medium",
      feedbackCorrect: "Bonne réponse : tu as évité la simplification excessive.",
      feedbackWrong: "Erreur pédagogique : le cas demande d'assembler plusieurs critères au lieu d'en isoler un seul.",
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
          label: "S'entraîner",
          href: "/learn/sentrainer",
          total: 3,
          correct: 2,
          accuracy: 0.66,
        },
      ],
      frequentErrorTypes: [
        { label: "raisonnement trop simpliste", count: 2 },
        { label: "idée reçue", count: 1 },
      ],
      recommendedMode: {
        id: "terrain",
        label: "Terrain",
        reason: "Ce mode couvre le mieux tes erreurs récentes (2 correspondances).",
      },
      recommendedLearningTarget: {
        label: "S'entraîner",
        href: "/learn/sentrainer",
      },
      nextReviewTarget: {
        label: "S'entraîner",
        href: "/learn/sentrainer",
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
        selectedOptions: [],
        showAnswer: false,
        showChoices: true,
        lastCheckResult: null,
        score: 5,
        shouldOfferMiniChallenge: false,
        nextReasoningType: null,
        hasReviewedToday: false,
        sessionSummary,
        onSelectOption: () => undefined,
        onToggleOption: () => undefined,
        onCheckAnswer: () => undefined,
        onPreviousQuestion: () => undefined,
        onNextQuestion: () => undefined,
        onResetQuiz: () => undefined,
        onStartMiniChallenge: () => undefined,
        onReplayRecommendedMode: () => undefined,
        onHandleSRSUpdate: () => undefined,
      }),
    );

    expect(markup).toContain("Bilan de session");
    expect(markup).toContain("5/6");
    expect(markup).toContain("83%");
    expect(markup).toContain("Compétences maîtrisées");
    expect(markup).toContain("Comprendre");
    expect(markup).toContain("Compétences à revoir");
    expect(markup).toContain("S&#x27;entraîner");
    expect(markup).toContain("Revoir cette notion");
    expect(markup).toContain("Mode conseillé :");
    expect(markup).toContain("/learn/sentrainer");
    expect(markup).toContain("Types d&#x27;erreurs fréquentes");
    expect(markup).toContain("Mode à rejouer");
    expect(markup).toContain("Terrain");
  });

  it("renders a clear demo banner without personal-progress messaging", () => {
    const question: QuizQuestion = {
      id: "demo-1",
      type: "true-false",
      category: "action-terrain",
      question: "Un déchet humide doit toujours être laissé au sol.",
      answer: "Faux",
      options: ["Vrai", "Faux"],
      explanation:
        "Un déchet humide n'a pas vocation à rester au sol: on l'évalue avec prudence et on suit la filière adaptée au contexte.",
      review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
      reasoningType: "terrain",
    };

    const markup = renderToStaticMarkup(
      React.createElement(QuizSessionPanel, {
        locale: "fr",
        isDemoMode: true,
        question,
        questionIndex: 0,
        totalQuestions: 5,
        currentQuestionState: null,
        currentQuestionReviewDate: "Aujourd'hui",
        currentQuestionStreak: 0,
        currentQuestionMasteryLevel: 0,
        selectedOption: "",
        selectedOptions: [],
        showAnswer: false,
        showChoices: true,
        lastCheckResult: null,
        score: 0,
        shouldOfferMiniChallenge: false,
        nextReasoningType: null,
        hasReviewedToday: true,
        sessionSummary: null,
        personalProgress: null,
        onSelectOption: () => undefined,
        onToggleOption: () => undefined,
        onCheckAnswer: () => undefined,
        onPreviousQuestion: () => undefined,
        onNextQuestion: () => undefined,
        onResetQuiz: () => undefined,
        onStartMiniChallenge: () => undefined,
        onReplayRecommendedMode: () => undefined,
        onHandleSRSUpdate: () => undefined,
      }),
    );

    expect(markup).toContain("Mode démo");
    expect(markup).toContain("Session courte de cinq questions");
    expect(markup).toContain("sans compte obligatoire");
    expect(markup).not.toContain("Compétences maîtrisées");
  });

  it("renders the school workshop summary in collective mode", () => {
    const question: QuizQuestion = {
      id: "school-1",
      type: "true-false",
      category: "action-terrain",
      question: "Question de test pour le mode école.",
      answer: "Vrai",
      options: ["Vrai", "Faux"],
      explanation: "Explication de test.",
      review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
      reviewTarget: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
      reasoningType: "terrain",
      errorType: "erreur de sécurité",
      feedbackCorrect: "Bonne réponse.",
      feedbackWrong: "Mauvaise réponse.",
    };

    const sessionSummary: QuizSessionSummary = {
      score: 3,
      totalQuestions: 4,
      totalAnswered: 4,
      themesSucceeded: [{ label: "Bonnes pratiques", href: "/learn/bonnes-pratiques", total: 2, correct: 2, accuracy: 1 }],
      themesToReview: [],
      frequentErrorTypes: [{ label: "erreur de sécurité", count: 2 }],
      recommendedMode: null,
      recommendedLearningTarget: null,
      nextReviewTarget: null,
    };

    const markup = renderToStaticMarkup(
      React.createElement(QuizSessionPanel, {
        locale: "fr",
        isSchoolMode: true,
        isCollectiveMode: true,
        schoolTrackLabel: "Débat en classe",
        schoolKeyMessages: ["On vote, on discute, puis on révèle."],
        question,
        questionIndex: 3,
        totalQuestions: 4,
        currentQuestionState: null,
        currentQuestionReviewDate: "Aujourd'hui",
        currentQuestionStreak: 0,
        currentQuestionMasteryLevel: 0,
        selectedOption: "",
        selectedOptions: [],
        showAnswer: false,
        showChoices: false,
        lastCheckResult: null,
        score: 3,
        shouldOfferMiniChallenge: false,
        nextReasoningType: null,
        hasReviewedToday: true,
        sessionSummary,
        onSelectOption: () => undefined,
        onToggleOption: () => undefined,
        onCheckAnswer: () => undefined,
        onRevealChoices: () => undefined,
        onRevealAnswer: () => undefined,
        onPreviousQuestion: () => undefined,
        onNextQuestion: () => undefined,
        onResetQuiz: () => undefined,
        onStartMiniChallenge: () => undefined,
        onReplayRecommendedMode: () => undefined,
        onHandleSRSUpdate: () => undefined,
      }),
    );

    expect(markup).toContain("Mode École");
    expect(markup).toContain("Mode collectif");
    expect(markup).toContain("Bilan de l’atelier");
    expect(markup).toContain("Notions vues");
    expect(markup).toContain("Erreurs fréquentes");
    expect(markup).toContain("Messages clés");
  });

  it("renders the school reveal controls before the answer is shown", () => {
    const question: QuizQuestion = {
      id: "school-hidden-1",
      type: "true-false",
      category: "action-terrain",
      question: "Question cachée pour le mode école.",
      answer: "Vrai",
      options: ["Vrai", "Faux"],
      explanation: "Explication cachée.",
      review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
      reviewTarget: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
      reasoningType: "terrain",
      feedbackCorrect: "Bonne réponse.",
      feedbackWrong: "Mauvaise réponse.",
      takeaway: "On peut d'abord réfléchir avant d'afficher le corrigé.",
    };

    const markup = renderToStaticMarkup(
      React.createElement(QuizSessionPanel, {
        locale: "fr",
        isSchoolMode: true,
        isCollectiveMode: true,
        showChoices: false,
        question,
        questionIndex: 1,
        totalQuestions: 4,
        currentQuestionState: null,
        currentQuestionReviewDate: "Aujourd'hui",
        currentQuestionStreak: 0,
        currentQuestionMasteryLevel: 0,
        selectedOption: "",
        selectedOptions: [],
        showAnswer: false,
        lastCheckResult: null,
        score: 0,
        shouldOfferMiniChallenge: false,
        nextReasoningType: null,
        hasReviewedToday: false,
        onSelectOption: () => undefined,
        onToggleOption: () => undefined,
        onCheckAnswer: () => undefined,
        onRevealChoices: () => undefined,
        onRevealAnswer: () => undefined,
        onPreviousQuestion: () => undefined,
        onNextQuestion: () => undefined,
        onResetQuiz: () => undefined,
        onStartMiniChallenge: () => undefined,
        onReplayRecommendedMode: () => undefined,
        onHandleSRSUpdate: () => undefined,
      }),
    );

    expect(markup).toContain("Réponses masquées");
    expect(markup).toContain("Afficher les réponses");
    expect(markup).toContain("Révéler la bonne réponse");
  });

  it("renders school navigation once the answer is revealed", () => {
    const question: QuizQuestion = {
      id: "school-nav-1",
      type: "true-false",
      category: "action-terrain",
      question: "Question de navigation pour le mode école.",
      answer: "Vrai",
      options: ["Vrai", "Faux"],
      explanation: "Explication de navigation.",
      review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
      reviewTarget: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
      reasoningType: "terrain",
      feedbackCorrect: "Bonne réponse.",
      feedbackWrong: "Mauvaise réponse.",
      takeaway: "On peut maintenant passer à la question suivante.",
    };

    const markup = renderToStaticMarkup(
      React.createElement(QuizSessionPanel, {
        locale: "fr",
        isSchoolMode: true,
        isCollectiveMode: true,
        showChoices: true,
        question,
        questionIndex: 2,
        totalQuestions: 4,
        currentQuestionState: null,
        currentQuestionReviewDate: "Aujourd'hui",
        currentQuestionStreak: 0,
        currentQuestionMasteryLevel: 0,
        selectedOption: "Vrai",
        selectedOptions: [],
        showAnswer: true,
        lastCheckResult: true,
        score: 1,
        shouldOfferMiniChallenge: false,
        nextReasoningType: null,
        hasReviewedToday: false,
        onSelectOption: () => undefined,
        onToggleOption: () => undefined,
        onCheckAnswer: () => undefined,
        onRevealChoices: () => undefined,
        onRevealAnswer: () => undefined,
        onPreviousQuestion: () => undefined,
        onNextQuestion: () => undefined,
        onResetQuiz: () => undefined,
        onStartMiniChallenge: () => undefined,
        onReplayRecommendedMode: () => undefined,
        onHandleSRSUpdate: () => undefined,
      }),
    );

    expect(markup).toContain("Question précédente");
    expect(markup).toContain("Question suivante");
    expect(markup).toContain("À retenir");
  });

  it("renders a checkbox-based question as multiple selectable answers", () => {
    const question: QuizQuestion = {
      id: "ms-1",
      type: "multiple-select",
      category: "action-terrain",
      question: "Quels objets ne dois-tu pas ramasser lors d'une action ?",
      answer: [
        "Une seringue usagée",
        "Un bidon fermé contenant un liquide inconnu",
        "Un verre cassé",
        "Un déchet souillé par une substance suspecte",
      ],
      options: [
        "Une seringue usagée",
        "Un bidon fermé contenant un liquide inconnu",
        "Un verre cassé",
        "Un déchet souillé par une substance suspecte",
        "Une canette vide",
        "Un emballage propre et sec",
      ],
      explanation:
        "On ne ramasse pas ce qui coupe, perce ou expose à un produit inconnu. Dans le doute, on isole et on signale plutôt que de manipuler.",
      review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
      reasoningType: "terrain",
      format: "cases-a-cocher",
      reviewTarget: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
      errorType: "erreur de sécurité",
      misconception: "Le risque concret a été sous-estimé au profit de la rapidité.",
      severity: "high",
      feedbackCorrect: "Bon réflexe : tu as protégé la sécurité avant la vitesse.",
      feedbackWrong: "Erreur pédagogique : en contexte terrain, la sécurité du geste passe avant le gain de temps.",
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
        selectedOption: "",
        selectedOptions: ["Une seringue usagée", "Un verre cassé"],
        showAnswer: false,
        showChoices: true,
        lastCheckResult: null,
        score: 0,
        shouldOfferMiniChallenge: false,
        nextReasoningType: null,
        hasReviewedToday: false,
        onSelectOption: () => undefined,
        onToggleOption: () => undefined,
        onCheckAnswer: () => undefined,
        onPreviousQuestion: () => undefined,
        onNextQuestion: () => undefined,
        onResetQuiz: () => undefined,
        onStartMiniChallenge: () => undefined,
        onReplayRecommendedMode: () => undefined,
        onHandleSRSUpdate: () => undefined,
      }),
    );

    expect(markup).toContain("Cases à cocher");
    expect(markup).toContain("Vérifier la réponse");
    expect(markup).toContain("Une seringue usagée");
    expect(markup).toContain("Un emballage propre et sec");
  });
});
