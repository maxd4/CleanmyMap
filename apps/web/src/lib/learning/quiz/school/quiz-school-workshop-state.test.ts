import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createQuizSchoolWorkshopState,
  getQuizSchoolWorkshopProgress,
  nextQuizSchoolWorkshopPhase,
  previousQuizSchoolWorkshopPhase,
  recordQuizSchoolWorkshopAnswer,
  QUIZ_SCHOOL_WORKSHOP_PHASES,
  QUIZ_SCHOOL_WORKSHOP_TIMING,
} from "./quiz-school-workshop-state";

describe("school/quiz-school-workshop-state", () => {
  it("keeps the exact public 60-minute sequence", () => {
    expect(QUIZ_SCHOOL_WORKSHOP_PHASES).toEqual(["pre-quiz", "atelier", "post-quiz", "bilan"]);
    expect(QUIZ_SCHOOL_WORKSHOP_TIMING).toEqual({
      totalMinutes: 60,
      preQuizMinutes: 15,
      activityMinutes: 30,
      postQuizMinutes: 15,
    });
  });

  it("moves forward through pre-quiz, activity, post-quiz and review", () => {
    let state = createQuizSchoolWorkshopState();
    for (let index = 0; index < 5; index += 1) state = nextQuizSchoolWorkshopPhase(state, 5);
    expect(state.phase).toBe("atelier");
    state = nextQuizSchoolWorkshopPhase(state, 5);
    expect(state.phase).toBe("post-quiz");
    for (let index = 0; index < 5; index += 1) state = nextQuizSchoolWorkshopPhase(state, 5);
    expect(state.phase).toBe("bilan");
  });

  it("supports controlled backwards navigation without losing collective answers", () => {
    let state = createQuizSchoolWorkshopState();
    state = recordQuizSchoolWorkshopAnswer(state, "pre-quiz", "q1", true);
    for (let index = 0; index < 5; index += 1) state = nextQuizSchoolWorkshopPhase(state, 5);
    expect(previousQuizSchoolWorkshopPhase(state, 5).phase).toBe("pre-quiz");
    expect(state.preAnswers).toEqual({ q1: true });
    expect(getQuizSchoolWorkshopProgress(state, 5, 5)).toMatchObject({ preCorrect: 1, postCorrect: 0, preTotal: 5, postTotal: 5, total: 5 });
  });

  it("supports distinct pre/post question counts", () => {
    let state = createQuizSchoolWorkshopState();
    for (let index = 0; index < 8; index += 1) state = nextQuizSchoolWorkshopPhase(state, 8, 1, 10);
    state = nextQuizSchoolWorkshopPhase(state, 8, 1, 10);
    expect(state.phase).toBe("post-quiz");
    for (let index = 0; index < 10; index += 1) state = nextQuizSchoolWorkshopPhase(state, 8, 1, 10);
    expect(state.phase).toBe("bilan");
    expect(getQuizSchoolWorkshopProgress(state, 8, 10)).toMatchObject({ preTotal: 8, postTotal: 10, total: 10 });
  });

  it("keeps every pedagogical activity in the 30-minute phase before the post-quiz", () => {
    let state = createQuizSchoolWorkshopState();
    for (let index = 0; index < 5; index += 1) state = nextQuizSchoolWorkshopPhase(state, 5, 7);

    expect(state).toMatchObject({ phase: "atelier", activityIndex: 0 });
    for (let index = 1; index < 7; index += 1) {
      state = nextQuizSchoolWorkshopPhase(state, 5, 7);
      expect(state).toMatchObject({ phase: "atelier", activityIndex: index });
    }

    expect(nextQuizSchoolWorkshopPhase(state, 5, 7)).toMatchObject({ phase: "post-quiz", activityIndex: 0 });
  });

  it("keeps the public workshop anonymous and memory-only", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/learn/quiz/school/quiz-school-workshop-session.tsx"), "utf8");
    expect(source).not.toContain("useAuth");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("sessionStorage");
    expect(source).not.toContain("saveQuiz");
    expect(source).not.toContain("studentName");
    expect(source).not.toContain("classId");
    expect(source).not.toContain("studentId");
    expect(source).toContain("Taux avant");
    expect(source).toContain("Taux après");
    expect(source).toContain("Lieux franciliens pour poursuivre");
    expect(source).toContain("territorialResources");
  });
});
