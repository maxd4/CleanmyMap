import { describe, expect, it } from "vitest";

import {
  QUIZ_SCHOOL_KIT_BANK,
  QUIZ_SCHOOL_KIT_STEPS,
  QUIZ_SCHOOL_STUDENT_SHEET,
  QUIZ_SCHOOL_TEACHER_GUIDE,
  groupQuizSchoolKitQuestionsByTrack,
} from "./quiz-school-kit";

describe("quiz-school-kit", () => {
  it("keeps a compact starter bank of twenty questions", () => {
    expect(QUIZ_SCHOOL_KIT_BANK).toHaveLength(20);
    expect(QUIZ_SCHOOL_KIT_STEPS).toHaveLength(4);
    expect(QUIZ_SCHOOL_TEACHER_GUIDE).toHaveLength(6);
    expect(QUIZ_SCHOOL_STUDENT_SHEET).toHaveLength(4);

    const grouped = groupQuizSchoolKitQuestionsByTrack(QUIZ_SCHOOL_KIT_BANK);

    expect(grouped["debat-classe"]).toHaveLength(5);
    expect(grouped["mission-terrain"]).toHaveLength(5);
    expect(grouped["ordres-de-grandeur"]).toHaveLength(5);
    expect(grouped["gestes-du-quotidien"]).toHaveLength(5);
    expect(QUIZ_SCHOOL_KIT_BANK.every((question) => question.takeaway.trim().length > 0)).toBe(true);
    expect(
      QUIZ_SCHOOL_KIT_BANK.some((question) => question.status?.kind === "needsReview"),
    ).toBe(true);
  });
});
