import { getQuizReviewTarget } from "./quiz-review-targets";
import type {
  QuizPersonalProgressSession,
  QuizPersonalProgressState,
} from "./quiz-personal-progress.contracts";
import { createEmptyQuizPersonalProgressState } from "./quiz-personal-progress.normalization";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function cloneProgressState(
  progress: QuizPersonalProgressState,
  playedAt: string,
  session: QuizPersonalProgressSession,
): QuizPersonalProgressState {
  return {
    ...progress,
    modes: { ...progress.modes },
    skills: { ...progress.skills },
    errorTypes: { ...progress.errorTypes },
    reviewTargets: { ...progress.reviewTargets },
    recentSessions: [
      {
        mode: session.mode,
        score: session.score,
        totalQuestions: session.totalQuestions,
        accuracy: getAccuracy(session.score, session.totalQuestions),
        playedAt,
      },
      ...progress.recentSessions,
    ].slice(0, 10),
  };
}

function getAccuracy(correctAnswers: number, totalQuestions: number): number {
  if (totalQuestions <= 0) {
    return 0;
  }

  return correctAnswers / totalQuestions;
}

function mergeModeProgress(
  next: QuizPersonalProgressState,
  session: QuizPersonalProgressSession,
  playedAt: string,
): void {
  const currentMode = next.modes[session.mode] ?? {
    sessions: 0,
    correctAnswers: 0,
    totalQuestions: 0,
    lastPlayedAt: playedAt,
  };
  next.modes[session.mode] = {
    sessions: currentMode.sessions + 1,
    correctAnswers: currentMode.correctAnswers + session.score,
    totalQuestions: currentMode.totalQuestions + session.totalQuestions,
    lastPlayedAt: playedAt,
  };
}

function mergeQuestionProgress(
  next: QuizPersonalProgressState,
  session: QuizPersonalProgressSession,
  playedAt: string,
): void {
  for (const question of session.questions) {
    const isAnswered = Object.prototype.hasOwnProperty.call(session.results, question.id);
    if (!isAnswered) {
      continue;
    }

    const isCorrect = session.results[question.id] ?? false;
    const currentSkill = next.skills[question.reasoningType] ?? {
      attempts: 0,
      correctAnswers: 0,
      lastPlayedAt: playedAt,
    };
    next.skills[question.reasoningType] = {
      attempts: currentSkill.attempts + 1,
      correctAnswers: currentSkill.correctAnswers + (isCorrect ? 1 : 0),
      lastPlayedAt: playedAt,
    };

    const reviewTarget =
      question.reviewTarget ??
      question.review ??
      getQuizReviewTarget(question.category, undefined, question.reasoningType);
    const currentReviewTarget = next.reviewTargets[reviewTarget.href] ?? {
      label: reviewTarget.label,
      href: reviewTarget.href,
      attempts: 0,
      correctAnswers: 0,
      lastSeenAt: playedAt,
    };
    next.reviewTargets[reviewTarget.href] = {
      label: reviewTarget.label,
      href: reviewTarget.href,
      attempts: currentReviewTarget.attempts + 1,
      correctAnswers: currentReviewTarget.correctAnswers + (isCorrect ? 1 : 0),
      lastSeenAt: playedAt,
    };
  }
}

function mergeErrorProgress(
  next: QuizPersonalProgressState,
  session: QuizPersonalProgressSession,
  playedAt: string,
): void {
  for (const [errorType, count] of Object.entries(session.errorCounts)) {
    if (!isFiniteNumber(count) || count <= 0) {
      continue;
    }

    const currentError = next.errorTypes[errorType] ?? {
      count: 0,
      lastSeenAt: playedAt,
    };
    next.errorTypes[errorType] = {
      count: currentError.count + Math.trunc(count),
      lastSeenAt: playedAt,
    };
  }
}

export function mergeQuizPersonalProgress(
  previous: QuizPersonalProgressState | null,
  session: QuizPersonalProgressSession,
): QuizPersonalProgressState {
  const current = previous ?? createEmptyQuizPersonalProgressState();
  const playedAt = session.playedAt ?? new Date().toISOString();
  const next = cloneProgressState(current, playedAt, session);

  mergeModeProgress(next, session, playedAt);
  mergeQuestionProgress(next, session, playedAt);
  mergeErrorProgress(next, session, playedAt);

  return next;
}
