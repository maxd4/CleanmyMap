import { describe, expect, it } from "vitest";
import {
  getQuizSchoolWorkshopAssessment,
  getQuizSchoolWorkshopAssessmentItemsForTesting,
  getQuizSchoolWorkshopAssessmentPairs,
  QUIZ_SCHOOL_WORKSHOP_POST_ASSESSMENT_SIZE,
  QUIZ_SCHOOL_WORKSHOP_PRE_ASSESSMENT_SIZE,
  type QuizSchoolWorkshopAssessmentItem,
} from "./quiz-school-workshop-assessment";

const LEVELS = ["6e", "5e", "4e", "3e"] as const;

describe("school/quiz-school-workshop-assessment", () => {
  it.each(LEVELS)("compose %s pré/post sans sortir du niveau", (level) => {
    const pre = getQuizSchoolWorkshopAssessment(level, "pre-quiz");
    const post = getQuizSchoolWorkshopAssessment(level, "post-quiz");

    expect(pre).toHaveLength(QUIZ_SCHOOL_WORKSHOP_PRE_ASSESSMENT_SIZE);
    expect(post).toHaveLength(QUIZ_SCHOOL_WORKSHOP_POST_ASSESSMENT_SIZE);
    expect(getQuizSchoolWorkshopAssessment(level, "pre-quiz")).toEqual(pre);
    expect(getQuizSchoolWorkshopAssessment(level, "post-quiz")).toEqual(post);
    expect(pre.every((item) => item.allowedLevels.includes(level) && item.levelProfiles[level])).toBe(true);
    expect(post.every((item) => item.allowedLevels.includes(level) && item.levelProfiles[level])).toBe(true);
    expect([...pre, ...post].every((item) => item.validationStatus === "validated" && !item.needsReview)).toBe(true);
  });

  it("mesure les huit mêmes concepts et ajoute deux transferts au post-quiz", () => {
    const pairs = getQuizSchoolWorkshopAssessmentPairs();
    const pre = getQuizSchoolWorkshopAssessment("4e", "pre-quiz");
    const post = getQuizSchoolWorkshopAssessment("4e", "post-quiz");

    expect(pairs).toHaveLength(8);
    expect(pre.map((item) => item.conceptId)).toEqual(pairs.map((pair) => pair.conceptId));
    expect(post.filter((item) => item.isTransfer)).toHaveLength(2);
    expect(pairs.every((pair) => pair.pre.prompt.fr !== pair.post.prompt.fr)).toBe(true);
    expect(new Set([...pre, ...post].map((item) => item.id)).size).toBe(18);
  });

  it("exclut les éléments à revoir et les éléments hors niveau", () => {
    const canonical = getQuizSchoolWorkshopAssessmentItemsForTesting();
    const reviewOnly: QuizSchoolWorkshopAssessmentItem = { ...canonical[0], id: "review-only", needsReview: true };
    const sixOnly: QuizSchoolWorkshopAssessmentItem = { ...canonical[1], id: "six-only", allowedLevels: ["6e"] };

    expect(getQuizSchoolWorkshopAssessment("3e", "pre-quiz", [reviewOnly, sixOnly])).toEqual([]);
  });
});
