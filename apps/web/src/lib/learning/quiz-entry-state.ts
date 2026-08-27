import { QUIZ_ACCESS_TYPES, type QuizAccessTypeId } from "./quiz-access-types";
import { QUIZ_SCHOOL_TRACK_ORDER, type QuizSchoolTrackId } from "./quiz-school-types";

export type QuizSentrainerEntryState = {
  initialAccessType: QuizAccessTypeId | null;
  initialDemoMode: boolean;
  initialSchoolTrack: QuizSchoolTrackId | null;
  initialCollectiveMode: boolean;
};

function isQuizAccessTypeId(value: string | null): value is QuizAccessTypeId {
  return Boolean(value) && QUIZ_ACCESS_TYPES.some((accessType) => accessType.id === value);
}

function isQuizSchoolTrackId(value: string | null): value is QuizSchoolTrackId {
  return Boolean(value) && QUIZ_SCHOOL_TRACK_ORDER.includes(value as QuizSchoolTrackId);
}

function resolveInitialAccessType(mode: string | null): QuizAccessTypeId | null {
  if (mode === "demo") {
    return "mixte";
  }

  if (isQuizAccessTypeId(mode)) {
    return mode;
  }

  return null;
}

function resolveInitialSchoolTrack(mode: string | null, track: string | null): QuizSchoolTrackId | null {
  if (mode !== "ecole") {
    return null;
  }

  if (isQuizSchoolTrackId(track)) {
    return track;
  }

  return QUIZ_SCHOOL_TRACK_ORDER[0] ?? null;
}

export function parseQuizSentrainerEntryState(
  searchParams: Pick<URLSearchParams, "get"> | null | undefined,
): QuizSentrainerEntryState {
  const mode = searchParams?.get("mode")?.trim() ?? null;
  const track = searchParams?.get("track")?.trim() ?? null;
  const collective = searchParams?.get("collective")?.trim() ?? null;

  return {
    initialAccessType: resolveInitialAccessType(mode),
    initialDemoMode: mode === "demo",
    initialSchoolTrack: resolveInitialSchoolTrack(mode, track),
    initialCollectiveMode: collective !== "0",
  };
}
