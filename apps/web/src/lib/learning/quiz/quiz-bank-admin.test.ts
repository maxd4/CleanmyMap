import { describe, expect, it } from "vitest";
import { QUIZ_QUESTIONS } from "./quiz-question-bank";
import {
  buildQuizBankAdminSnapshot,
  DEFAULT_QUIZ_BANK_ADMIN_FILTERS,
  filterQuizBankAdminQuestions,
  type QuizBankAdminQuestion,
} from "./quiz-bank-admin";

function createQuestion(overrides: Partial<QuizBankAdminQuestion> = {}): QuizBankAdminQuestion {
  return {
    id: "question",
    question: "Question de test",
    answer: "Réponse",
    explanation: "Explication",
    category: "action-terrain",
    categoryLabel: "Action terrain",
    accessTypeIds: ["mixte"],
    accessTypeLabels: ["Mixte"],
    pedagogicalType: "situations-terrain",
    pedagogicalTypeLabel: "Situation terrain",
    skill: "terrain",
    skillLabel: "Terrain",
    difficulty: "medium",
    trapLevel: "medium",
    reasoningType: "terrain",
    sourceState: "sourced",
    hasSource: true,
    qualityWarningCount: 0,
    qualityErrorCount: 0,
    qualityFlags: [],
    sourceFlags: [],
    reviewTargetLabel: "Action terrain",
    reviewTargetHref: "/actions/new",
    reviewReasons: [],
    suggestions: [],
    priorityScore: 0,
    priorityLabel: "Conforme",
    ...overrides,
  };
}

const filterFixtures = [
  createQuestion({ id: "mixte-missing-review", sourceState: "missing", hasSource: false, needsReview: true }),
  createQuestion({
    id: "terrain-sourced",
    accessTypeIds: ["terrain"],
    accessTypeLabels: ["Terrain"],
  }),
  createQuestion({
    id: "terrain-weak",
    accessTypeIds: ["terrain"],
    accessTypeLabels: ["Terrain"],
    sourceState: "weak",
    hasSource: true,
    needsReview: false,
  }),
  createQuestion({
    id: "scientific-sourced-review",
    accessTypeIds: ["donnees-scientifiques"],
    accessTypeLabels: ["Données scientifiques"],
    skill: "estimation",
    skillLabel: "Estimation",
    needsReview: true,
  }),
];

describe("quiz bank admin snapshot", () => {
  it("prioritizes review questions and exposes filterable metadata", () => {
    const snapshot = buildQuizBankAdminSnapshot(QUIZ_QUESTIONS);

    expect(snapshot.totalQuestions).toBe(QUIZ_QUESTIONS.length);
    expect(snapshot.questions[0]?.priorityScore ?? 0).toBeGreaterThanOrEqual(
      snapshot.questions.at(-1)?.priorityScore ?? 0,
    );
    expect(snapshot.reviewCount).toBeGreaterThan(0);
    expect(snapshot.questions.some((question) => question.reviewReasons.length > 0)).toBe(true);
    expect(snapshot.byMode.mixte).toBeGreaterThan(0);
    expect(snapshot.byMode.terrain).toBeGreaterThan(0);
  });
});

describe("quiz bank admin filters", () => {
  it("returns every question with the default filters", () => {
    expect(filterQuizBankAdminQuestions(filterFixtures, DEFAULT_QUIZ_BANK_ADMIN_FILTERS)).toEqual(filterFixtures);
  });

  it("filters by mode", () => {
    expect(
      filterQuizBankAdminQuestions(filterFixtures, {
        ...DEFAULT_QUIZ_BANK_ADMIN_FILTERS,
        mode: "terrain",
      }).map((question) => question.id),
    ).toEqual(["terrain-sourced", "terrain-weak"]);
  });

  it("filters by source state and needsReview inclusion or exclusion", () => {
    expect(
      filterQuizBankAdminQuestions(filterFixtures, {
        ...DEFAULT_QUIZ_BANK_ADMIN_FILTERS,
        sourceState: "missing",
      }).map((question) => question.id),
    ).toEqual(["mixte-missing-review"]);

    expect(
      filterQuizBankAdminQuestions(filterFixtures, {
        ...DEFAULT_QUIZ_BANK_ADMIN_FILTERS,
        needsReview: "only",
      }).map((question) => question.id),
    ).toEqual(["mixte-missing-review", "scientific-sourced-review"]);

    expect(
      filterQuizBankAdminQuestions(filterFixtures, {
        ...DEFAULT_QUIZ_BANK_ADMIN_FILTERS,
        needsReview: "excluded",
      }).map((question) => question.id),
    ).toEqual(["terrain-sourced", "terrain-weak"]);
  });

  it("combines mode, skill, source and review filters", () => {
    expect(
      filterQuizBankAdminQuestions(filterFixtures, {
        ...DEFAULT_QUIZ_BANK_ADMIN_FILTERS,
        mode: "donnees-scientifiques",
        skill: "estimation",
        sourceState: "sourced",
        needsReview: "only",
      }).map((question) => question.id),
    ).toEqual(["scientific-sourced-review"]);
  });
});
