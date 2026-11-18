import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/site-preferences-provider", async () =>
  (await import("@/app/learn/test-helpers")).createLearnSitePreferencesModule(),
);

vi.mock("@/components/learn/learn-rubric-shell", async () =>
  (await import("@/app/learn/test-helpers")).createLearnRubricShellModule(),
);

vi.mock("@/components/learn/learn-practice-visual-intro", () => ({
  LearnPracticeVisualIntro: () => null,
}));
vi.mock("@/components/learn/learn-block-journey-section", () => ({
  LearnBlockJourneySection: () => null,
}));
vi.mock("@/components/learn/quiz/quiz-architecture-strip", () => ({
  QuizArchitectureStrip: () => null,
}));
vi.mock("@/components/learn/learn-deferred-panels", () => ({
  DeferredEnvironmentalQuiz: () => null,
}));
vi.mock("@/components/learn/learn-sentrainer-quiz-entry", () => ({
  LearnSentrainerQuizEntry: () => null,
}));
vi.mock("@/components/learn/learn-page-visit-tracker", () => ({
  LearnPageVisitTracker: () => null,
}));

import Page from "./page";

describe("sentrainer page", () => {
  it("renders a single canonical heading through LearnRubricShell in the server-rendered document", async () => {
    const markup = renderToStaticMarkup(Page());

    expect(markup).toContain("S&#x27;entraîner");
    expect(markup.match(/<h1\b/g)).toHaveLength(1);
  });
});
