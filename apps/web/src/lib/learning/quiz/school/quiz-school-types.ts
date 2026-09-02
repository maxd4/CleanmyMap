import type { QuizDifficultyId, QuizSkillId } from "../quiz-taxonomy";

export type QuizSchoolLevel = "6e" | "5e" | "4e" | "3e";

export const QUIZ_SCHOOL_LEVEL_ORDER: readonly QuizSchoolLevel[] = ["6e", "5e", "4e", "3e"];

export const DEFAULT_QUIZ_SCHOOL_LEVEL: QuizSchoolLevel = "4e";

export const QUIZ_SCHOOL_SESSION_DURATION_MINUTES = 30;
export const QUIZ_SCHOOL_SESSION_SIZE = 15;

export type QuizSchoolFormat = "quiz-30" | "atelier-60";

export const QUIZ_SCHOOL_FORMAT_ORDER: readonly QuizSchoolFormat[] = ["quiz-30", "atelier-60"];
export const DEFAULT_QUIZ_SCHOOL_FORMAT: QuizSchoolFormat = "quiz-30";
export const QUIZ_SCHOOL_WORKSHOP_DURATION_MINUTES = 60;
export const QUIZ_SCHOOL_WORKSHOP_QUIZ_DURATION_MINUTES = 15;
export const QUIZ_SCHOOL_WORKSHOP_ACTIVITY_DURATION_MINUTES = 30;
export const QUIZ_SCHOOL_WORKSHOP_QUIZ_SIZE = 5;

export function isQuizSchoolFormat(value: string | null | undefined): value is QuizSchoolFormat {
  return Boolean(value) && QUIZ_SCHOOL_FORMAT_ORDER.includes(value as QuizSchoolFormat);
}

export function parseQuizSchoolFormat(value: string | null | undefined): QuizSchoolFormat {
  return isQuizSchoolFormat(value) ? value : DEFAULT_QUIZ_SCHOOL_FORMAT;
}

export type QuizSchoolQuestionLevelProfile = {
  difficulty: QuizDifficultyId;
  skills: readonly QuizSkillId[];
};

export type QuizSchoolQuestionEligibility = Partial<
  Record<QuizSchoolLevel, QuizSchoolQuestionLevelProfile>
>;

export function isQuizSchoolLevel(value: string | null | undefined): value is QuizSchoolLevel {
  return Boolean(value) && QUIZ_SCHOOL_LEVEL_ORDER.includes(value as QuizSchoolLevel);
}

export function parseQuizSchoolLevel(value: string | null | undefined): QuizSchoolLevel {
  return isQuizSchoolLevel(value) ? value : DEFAULT_QUIZ_SCHOOL_LEVEL;
}

export type QuizSchoolTrackId =
  | "debat-classe"
  | "mission-terrain"
  | "ordres-de-grandeur"
  | "gestes-du-quotidien";

export const QUIZ_SCHOOL_TRACK_ORDER: readonly QuizSchoolTrackId[] = [
  "debat-classe",
  "mission-terrain",
  "ordres-de-grandeur",
  "gestes-du-quotidien",
];

export const QUIZ_SCHOOL_TRACK_QUESTION_IDS: Readonly<Record<QuizSchoolTrackId, readonly string[]>> = {
  "debat-classe": ["e1", "e2", "e3", "n1", "n2", "n5", "v4", "v5", "v3", "im1", "im4", "im5", "im6", "im9", "hb2"],
  "mission-terrain": ["at7", "at8", "at9", "at10", "at11", "at12", "at13", "at14", "at15", "at16", "at17", "at18", "at19", "at20", "at21"],
  "ordres-de-grandeur": ["n2", "cb5", "cb6", "i3", "i4", "i7", "i8", "v1", "v2", "v3", "v5", "x3", "x4", "im3", "im8"],
  "gestes-du-quotidien": ["ec1", "ec2", "hb1", "hb2", "co1", "im6", "im11", "im12", "im13", "im14", "im15", "im16", "im17", "rc1", "rc2"],
};

const QUIZ_SCHOOL_TRACK_BY_QUESTION_ID: Readonly<Record<string, QuizSchoolTrackId>> = Object.freeze(
  Object.fromEntries(
    QUIZ_SCHOOL_TRACK_ORDER.flatMap((trackId) =>
      QUIZ_SCHOOL_TRACK_QUESTION_IDS[trackId].map((questionId) => [questionId, trackId] as const),
    ),
  ) as Record<string, QuizSchoolTrackId>,
);

export function getQuizSchoolTrackId(questionId: string): QuizSchoolTrackId | undefined {
  return QUIZ_SCHOOL_TRACK_BY_QUESTION_ID[questionId];
}
