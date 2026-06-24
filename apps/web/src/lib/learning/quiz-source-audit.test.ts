import { describe, expect, it } from "vitest";
import type { QuizQuestion } from "../../components/learn/environmental-quiz";
import { auditQuizSources } from "./quiz-source-audit";

describe("quiz source audit", () => {
  it("lists the requested source hygiene buckets", () => {
    const questions: QuizQuestion[] = [
      {
        id: "missing-source",
        type: "true-false",
        category: "tri-recyclage",
        question: "Le tri local suit-il toujours la même règle partout ?",
        answer: "Faux",
        options: ["Vrai", "Faux"],
        explanation: "La réponse attendue dépend du territoire.",
        reasoningType: "terrain",
      },
      {
        id: "unsourced-number",
        type: "true-false",
        category: "climat-biodiversite",
        question: "Le chiffre 42 est-il toujours neutre sur le plan climatique ?",
        answer: "Faux",
        options: ["Vrai", "Faux"],
        explanation: "Le chiffre doit être relié à une source et à un contexte.",
        reasoningType: "estimation",
      },
      {
        id: "local-not-variable",
        type: "true-false",
        category: "tri-recyclage",
        question: "Une consigne locale de tri peut-elle être appliquée partout sans adaptation ?",
        answer: "Faux",
        options: ["Vrai", "Faux"],
        explanation: "Une consigne locale doit être marquée comme variable selon le territoire.",
        reasoningType: "terrain",
        sourceUrl: "https://www.citeo.com/le-tri",
        sourceLabel: "Citeo - Le tri",
        sourceType: "institutionnelle",
        confidenceLevel: "élevé",
        isLocalRule: true,
        localScope: "national",
        lastCheckedAt: "2026-06-21",
      },
      {
        id: "needs-review",
        type: "multiple-choice",
        category: "action-terrain",
        question: "Pourquoi faut-il parfois faire relire une question de terrain ?",
        answer: "Parce qu'elle reste éditorialement délicate",
        options: ["Parce qu'elle reste éditorialement délicate", "Parce qu'elle est toujours fausse"],
        explanation: "La question reste utile, mais elle demande une relecture avant publication.",
        reasoningType: "terrain",
        sourceUrl: "/documentation/features/quiz-authoring-guide.md",
        sourceLabel: "CleanMyMap - Guide pédagogique du quiz",
        sourceType: "interne",
        confidenceLevel: "moyen",
        isLocalRule: false,
        localScope: "national",
        lastCheckedAt: "2026-06-21",
        needsReview: true,
      },
      {
        id: "weak-source",
        type: "true-false",
        category: "impact-methodologie",
        question: "Un ordre de grandeur pédagogique reste-t-il une vérité universelle ?",
        answer: "Faux",
        options: ["Vrai", "Faux"],
        explanation: "C'est une estimation pédagogique, donc une source faible et cadrée.",
        reasoningType: "estimation",
        sourceUrl: "/documentation/features/quiz-authoring-guide.md",
        sourceLabel: "CleanMyMap - Ordres de grandeur pédagogiques",
        sourceType: "estimation",
        confidenceLevel: "moyen",
        isLocalRule: false,
        localScope: "national",
        lastCheckedAt: "2026-06-21",
      },
    ];

    const report = auditQuizSources(questions);

    expect(report.questionsWithoutSource.map((item) => item.questionId)).toContain("missing-source");
    expect(report.questionsWithUnsourcedFigures.map((item) => item.questionId)).toContain("unsourced-number");
    expect(report.questionsWithLocalRulesNotVariable.map((item) => item.questionId)).toContain("local-not-variable");
    expect(report.questionsToReview.map((item) => item.questionId)).toContain("needs-review");
    expect(report.weakOrVagueSources.map((item) => item.questionId)).toContain("weak-source");
    expect(report.blockingIssuesCount).toBe(3);
  });
});
