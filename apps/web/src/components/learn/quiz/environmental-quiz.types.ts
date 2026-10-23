import type { QuizAccessTypeId } from "@/lib/learning/quiz/quiz-access-types";
import type { QuizSchoolFormat, QuizSchoolLevel } from "@/lib/learning/quiz/school/quiz-school-types";

export type EnvironmentalQuizProps = {
  initialAccessType?: QuizAccessTypeId | null;
  initialDemoMode?: boolean;
  initialSchoolLevel?: QuizSchoolLevel | null;
  initialSchoolFormat?: QuizSchoolFormat | null;
  /** @deprecated Kept so old callers remain type-compatible. */
  initialSchoolTrack?: string | null;
  initialCollectiveMode?: boolean;
};
