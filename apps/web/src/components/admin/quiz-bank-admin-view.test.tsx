import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { QuizBankAdminQuestion, QuizBankAdminSnapshot } from "@/lib/learning/quiz/quiz-bank-admin";
import { QuizBankAdminView } from "./quiz-bank-admin-view";

const question = {
  id: "question-disclosure-1",
  question: "Quel geste est attendu ?",
  answer: "Le geste attendu",
  explanation: "Une explication conservée dans la carte.",
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
  sourceState: "missing",
  hasSource: false,
  qualityWarningCount: 0,
  qualityErrorCount: 0,
  qualityFlags: [],
  sourceFlags: ["Sans source"],
  reviewTargetLabel: "Action terrain",
  reviewTargetHref: "/actions/new",
  reviewReasons: ["Sans source"],
  suggestions: [],
  priorityScore: 90,
  priorityLabel: "À relire",
} satisfies QuizBankAdminQuestion;

const snapshot = {
  questions: [question],
  totalQuestions: 1,
  reviewCount: 1,
  missingSourceCount: 1,
  weakSourceCount: 0,
  obviousCount: 0,
  needsReviewCount: 0,
  byMode: {
    mixte: 1,
    ecole: 0,
    terrain: 1,
    "donnees-scientifiques": 0,
    sensibilisation: 0,
    "habitudes-de-vie": 0,
    "ordres-de-grandeur": 0,
    "tri-securite": 0,
  },
} satisfies QuizBankAdminSnapshot;

describe("QuizBankAdminView QuestionCard", () => {
  it("preserves the question id and derives the disclosure tone from source state", () => {
    const markup = renderToStaticMarkup(<QuizBankAdminView snapshot={snapshot} />);

    expect(markup).toContain('id="question-disclosure-1"');
    expect(markup).toContain('data-disclosure-tone="rose"');
    expect(markup).toContain("Quel geste est attendu ?");
    expect(markup).toContain("Une explication conservée dans la carte.");
  });
});
