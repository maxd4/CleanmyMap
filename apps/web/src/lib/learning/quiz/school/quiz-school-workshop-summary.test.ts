import { describe, expect, it } from "vitest";
import { getQuizSchoolWorkshopAssessment } from "./quiz-school-workshop-assessment";
import { composeQuizSchoolWorkshopActivities } from "./quiz-school-workshop-activities";
import { buildQuizSchoolWorkshopSummary } from "./quiz-school-workshop-summary";

describe("school/quiz-school-workshop-summary", () => {
  it("calcule localement les taux, la progression et les notions collectives", () => {
    const pre = getQuizSchoolWorkshopAssessment("4e", "pre-quiz");
    const post = getQuizSchoolWorkshopAssessment("4e", "post-quiz");
    const preAnswers = Object.fromEntries(pre.map((item, index) => [item.id, index < 4]));
    const postAnswers = Object.fromEntries(post.map((item, index) => [item.id, index < 6]));
    const summary = buildQuizSchoolWorkshopSummary({
      level: "4e",
      preAssessment: pre,
      postAssessment: post,
      preAnswers,
      postAnswers,
      activities: composeQuizSchoolWorkshopActivities("4e"),
    });

    expect(summary).toMatchObject({ preCorrect: 4, preTotal: 8, preRate: 0.5, postCorrect: 6, postTotal: 10, postRate: 0.6 });
    expect(summary.progress).toBeCloseTo(0.1);
    expect(summary.acquiredNotions.length).toBeGreaterThan(0);
    expect(summary.fragileNotions.length).toBeGreaterThan(0);
    expect(summary.retainedNotions).toHaveLength(3);
    expect(summary.collegeActions).toHaveLength(3);
    expect(summary.territorialResources.length).toBeGreaterThan(0);
  });

  it("ne propose pas de lieu non validé et possède un fallback territorial propre", () => {
    const pre = getQuizSchoolWorkshopAssessment("6e", "pre-quiz");
    const post = getQuizSchoolWorkshopAssessment("6e", "post-quiz");
    const summary = buildQuizSchoolWorkshopSummary({
      level: "6e",
      preAssessment: pre,
      postAssessment: post,
      preAnswers: {},
      postAnswers: {},
      activities: composeQuizSchoolWorkshopActivities("6e"),
      territorialResources: [],
    });

    expect(summary.territorialResources).toEqual([]);
    expect(summary.retainedNotions).toHaveLength(3);
  });
});
