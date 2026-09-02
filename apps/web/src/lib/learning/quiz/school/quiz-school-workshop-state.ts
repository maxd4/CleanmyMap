import {
  QUIZ_SCHOOL_WORKSHOP_ACTIVITY_DURATION_MINUTES,
  QUIZ_SCHOOL_WORKSHOP_DURATION_MINUTES,
  QUIZ_SCHOOL_WORKSHOP_QUIZ_DURATION_MINUTES,
  QUIZ_SCHOOL_WORKSHOP_QUIZ_SIZE,
} from "./quiz-school-types.ts";

export const QUIZ_SCHOOL_WORKSHOP_PHASES = ["pre-quiz", "atelier", "post-quiz", "bilan"] as const;
export type QuizSchoolWorkshopPhase = (typeof QUIZ_SCHOOL_WORKSHOP_PHASES)[number];

export type QuizSchoolWorkshopState = {
  phase: QuizSchoolWorkshopPhase;
  questionIndex: number;
  preAnswers: Readonly<Record<string, boolean>>;
  postAnswers: Readonly<Record<string, boolean>>;
};

export const QUIZ_SCHOOL_WORKSHOP_TIMING = Object.freeze({
  totalMinutes: QUIZ_SCHOOL_WORKSHOP_DURATION_MINUTES,
  preQuizMinutes: QUIZ_SCHOOL_WORKSHOP_QUIZ_DURATION_MINUTES,
  activityMinutes: QUIZ_SCHOOL_WORKSHOP_ACTIVITY_DURATION_MINUTES,
  postQuizMinutes: QUIZ_SCHOOL_WORKSHOP_QUIZ_DURATION_MINUTES,
});

export function createQuizSchoolWorkshopState(): QuizSchoolWorkshopState {
  return { phase: "pre-quiz", questionIndex: 0, preAnswers: {}, postAnswers: {} };
}

export function recordQuizSchoolWorkshopAnswer(
  state: QuizSchoolWorkshopState,
  phase: "pre-quiz" | "post-quiz",
  questionId: string,
  isCorrect: boolean,
): QuizSchoolWorkshopState {
  if (state.phase !== phase) return state;
  const answers = phase === "pre-quiz" ? state.preAnswers : state.postAnswers;
  return {
    ...state,
    [phase === "pre-quiz" ? "preAnswers" : "postAnswers"]: { ...answers, [questionId]: isCorrect },
  } as QuizSchoolWorkshopState;
}

export function nextQuizSchoolWorkshopPhase(
  state: QuizSchoolWorkshopState,
  questionCount = QUIZ_SCHOOL_WORKSHOP_QUIZ_SIZE,
): QuizSchoolWorkshopState {
  if (state.phase === "pre-quiz") {
    return state.questionIndex < questionCount - 1
      ? { ...state, questionIndex: state.questionIndex + 1 }
      : { ...state, phase: "atelier", questionIndex: 0 };
  }
  if (state.phase === "atelier") return { ...state, phase: "post-quiz", questionIndex: 0 };
  if (state.phase === "post-quiz") {
    return state.questionIndex < questionCount - 1
      ? { ...state, questionIndex: state.questionIndex + 1 }
      : { ...state, phase: "bilan", questionIndex: 0 };
  }
  return state;
}

export function previousQuizSchoolWorkshopPhase(
  state: QuizSchoolWorkshopState,
  questionCount = QUIZ_SCHOOL_WORKSHOP_QUIZ_SIZE,
): QuizSchoolWorkshopState {
  if (state.phase === "pre-quiz") {
    return state.questionIndex > 0 ? { ...state, questionIndex: state.questionIndex - 1 } : state;
  }
  if (state.phase === "atelier") return { ...state, phase: "pre-quiz", questionIndex: Math.max(questionCount - 1, 0) };
  if (state.phase === "post-quiz") {
    return state.questionIndex > 0
      ? { ...state, questionIndex: state.questionIndex - 1 }
      : { ...state, phase: "atelier", questionIndex: 0 };
  }
  return { ...state, phase: "post-quiz", questionIndex: Math.max(questionCount - 1, 0) };
}

export function getQuizSchoolWorkshopProgress(state: QuizSchoolWorkshopState) {
  const count = (answers: Readonly<Record<string, boolean>>) => Object.values(answers).filter(Boolean).length;
  return {
    preCorrect: count(state.preAnswers),
    postCorrect: count(state.postAnswers),
    total: QUIZ_SCHOOL_WORKSHOP_QUIZ_SIZE,
  };
}
