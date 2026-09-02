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

    expect(summary).toMatchObject({
      preConceptCorrect: 4,
      preConceptTotal: 8,
      preConceptRate: 0.5,
      postConceptCorrect: 6,
      postConceptTotal: 8,
      postConceptRate: 0.75,
      conceptProgress: 0.25,
      transferCorrect: 0,
      transferTotal: 2,
      transferRate: 0,
    });
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
    expect(summary.retainedNotions).toEqual([]);
  });

  it("ne mélange pas le transfert avec la progression des concepts", () => {
    const pre = getQuizSchoolWorkshopAssessment("4e", "pre-quiz");
    const post = getQuizSchoolWorkshopAssessment("4e", "post-quiz");
    const preAnswers = Object.fromEntries(pre.map((item, index) => [item.id, index < 4]));
    const postAnswers = Object.fromEntries(post.map((item, index) => [item.id, index < 6 || item.isTransfer === true]));
    const summary = buildQuizSchoolWorkshopSummary({
      level: "4e",
      preAssessment: pre,
      postAssessment: post,
      preAnswers,
      postAnswers,
      activities: composeQuizSchoolWorkshopActivities("4e"),
    });

    expect(summary.conceptProgress).toBeCloseTo(0.25);
    expect(summary.transferCorrect).toBe(2);
    expect(summary.transferTotal).toBe(2);
    expect(summary.retainedNotions).toHaveLength(3);
  });

  it("retourne uniquement les notions effectivement correctes au post-quiz", () => {
    const pre = getQuizSchoolWorkshopAssessment("4e", "pre-quiz");
    const post = getQuizSchoolWorkshopAssessment("4e", "post-quiz");
    const preAnswers = Object.fromEntries(pre.map((item) => [item.id, false]));
    const postAnswers = Object.fromEntries(post.map((item, index) => [item.id, index < 2]));
    const summary = buildQuizSchoolWorkshopSummary({
      level: "4e",
      preAssessment: pre,
      postAssessment: post,
      preAnswers,
      postAnswers,
      activities: composeQuizSchoolWorkshopActivities("4e"),
    });

    expect(summary.retainedNotions).toHaveLength(2);
    expect(summary.acquiredNotions).toHaveLength(2);
    expect(summary.fragileNotions).toHaveLength(6);
  });

  it("exclut les transferts des trois listes de notions", () => {
    const pre = getQuizSchoolWorkshopAssessment("4e", "pre-quiz");
    const post = getQuizSchoolWorkshopAssessment("4e", "post-quiz");
    const transfer = post.filter((item) => item.isTransfer);
    const summary = buildQuizSchoolWorkshopSummary({
      level: "4e",
      preAssessment: pre,
      postAssessment: post,
      preAnswers: Object.fromEntries(pre.map((item) => [item.id, false])),
      postAnswers: Object.fromEntries(post.map((item) => [item.id, transfer.includes(item)])),
      activities: composeQuizSchoolWorkshopActivities("4e"),
    });

    expect(summary.transferCorrect).toBe(2);
    expect(summary.acquiredNotions).toEqual([]);
    expect(summary.fragileNotions).toHaveLength(8);
    expect(summary.retainedNotions).toEqual([]);
  });

  it("conserve huit concepts appariés et deux transferts", () => {
    const pre = getQuizSchoolWorkshopAssessment("3e", "pre-quiz");
    const post = getQuizSchoolWorkshopAssessment("3e", "post-quiz");

    expect(pre).toHaveLength(8);
    expect(post.filter((item) => !item.isTransfer)).toHaveLength(8);
    expect(post.filter((item) => item.isTransfer)).toHaveLength(2);
    expect(new Set(pre.map((item) => item.pairId))).toEqual(
      new Set(post.filter((item) => !item.isTransfer).map((item) => item.pairId)),
    );
  });
});
