import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuizQuestion } from "@/components/learn/environmental-quiz";
import { QUIZ_ACCESS_TYPES, type QuizAccessTypeId } from "@/components/learn/quiz-access-types";
import { QUIZ_CATEGORY_LABELS, type QuizQuestionCategory, getQuizReviewTarget } from "@/components/learn/quiz-review-targets";
import type { QuizReasoningType } from "@/components/learn/quiz-reasoning-types";
import { getQuizPedagogicalTypeLabel } from "@/lib/learning/quiz-taxonomy";
import { getQuizTrapLevel } from "@/components/learn/quiz-trap-levels";
import type { QuizErrorTypeId } from "@/components/learn/quiz-error-grid";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type QuizPedagogicalMetricBucketType = "question" | "mode" | "skill" | "error_type";

export type QuizPedagogicalMetricRow = {
  bucket_type: QuizPedagogicalMetricBucketType;
  bucket_key: string;
  attempts: number;
  correct_count: number;
  wrong_count: number;
  session_count: number;
  last_seen_at: string | null;
};

export type QuizPedagogicalMetricsQuestionResult = {
  questionId: string;
  correct: boolean;
  skill: QuizReasoningType;
  pedagogicalType: string;
  errorType?: QuizErrorTypeId;
  category: string;
  difficulty?: string;
  trapLevel?: string;
};

export type QuizPedagogicalMetricsSession = {
  mode: QuizAccessTypeId;
  playedAt: string;
  totalQuestions: number;
  score: number;
  questions: QuizPedagogicalMetricsQuestionResult[];
};

export type QuizPedagogicalMetricsQuestionStat = {
  questionId: string;
  question: string;
  answer: string;
  category: QuizQuestionCategory;
  categoryLabel: string;
  pedagogicalType: string;
  pedagogicalTypeLabel: string;
  skill: QuizReasoningType;
  skillLabel: string;
  difficulty: string | null;
  trapLevel: string | null;
  attempts: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  isTooEasy: boolean;
  isTooHard: boolean;
  reviewTargetLabel: string;
  reviewTargetHref: string;
};

export type QuizPedagogicalMetricsModeStat = {
  id: QuizAccessTypeId;
  label: string;
  sessions: number;
  attempts: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  lastSeenAt: string | null;
};

export type QuizPedagogicalMetricsSkillStat = {
  skill: QuizReasoningType;
  label: string;
  attempts: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  lastSeenAt: string | null;
};

export type QuizPedagogicalMetricsErrorStat = {
  errorType: string;
  count: number;
  lastSeenAt: string | null;
};

export type QuizPedagogicalMetricsSnapshot = {
  totalAttempts: number;
  totalCorrect: number;
  totalWrong: number;
  overallAccuracy: number;
  modeStats: QuizPedagogicalMetricsModeStat[];
  questionStats: QuizPedagogicalMetricsQuestionStat[];
  easyQuestions: QuizPedagogicalMetricsQuestionStat[];
  hardQuestions: QuizPedagogicalMetricsQuestionStat[];
  weakSkills: QuizPedagogicalMetricsSkillStat[];
  frequentErrors: QuizPedagogicalMetricsErrorStat[];
};

const QUESTION_TOO_EASY_MIN_ATTEMPTS = 8;
const QUESTION_TOO_EASY_THRESHOLD = 0.85;
const QUESTION_TOO_HARD_MIN_ATTEMPTS = 6;
const QUESTION_TOO_HARD_THRESHOLD = 0.35;
const SKILL_REVIEW_MIN_ATTEMPTS = 5;
const SKILL_REVIEW_THRESHOLD = 0.6;

const REASONING_TYPE_LABELS: Record<QuizReasoningType, string> = {
  "idée reçue": "Idée reçue",
  terrain: "Terrain",
  estimation: "Estimation",
  comparaison: "Comparaison",
  "conséquences indirectes": "Conséquences indirectes",
  "questions contre-intuitives": "Question contre-intuitive",
  "cas-limites": "Cas limite",
  "mini-enquetes": "Mini enquête",
};

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getAnswerText(question: QuizQuestion): string {
  return Array.isArray(question.answer) ? question.answer.join(" / ") : question.answer;
}

function getAccuracy(correctCount: number, attempts: number): number {
  if (attempts <= 0) {
    return 0;
  }

  return correctCount / attempts;
}

function normalizeQuestionLookup(question: QuizQuestion): QuizPedagogicalMetricsQuestionStat {
  const pedagogicalType = question.pedagogicalType ?? question.format ?? question.type;
  const skill = question.skill ?? question.reasoningType;
  const reviewTarget = getQuizReviewTarget(question.category, question.reviewTarget, question.reasoningType);

  return {
    questionId: question.id,
    question: question.question,
    answer: getAnswerText(question),
    category: question.category,
    categoryLabel: QUIZ_CATEGORY_LABELS[question.category],
    pedagogicalType,
    pedagogicalTypeLabel: getQuizPedagogicalTypeLabel(pedagogicalType),
    skill,
    skillLabel: REASONING_TYPE_LABELS[skill],
    difficulty: question.difficulty ?? null,
    trapLevel: question.trapLevel ?? getQuizTrapLevel(question),
    attempts: 0,
    correctCount: 0,
    wrongCount: 0,
    accuracy: 0,
    isTooEasy: false,
    isTooHard: false,
    reviewTargetLabel: reviewTarget.label,
    reviewTargetHref: reviewTarget.href,
  };
}

function isValidMetricRow(value: unknown): value is QuizPedagogicalMetricRow {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const row = value as Record<string, unknown>;
  const bucketType = row["bucket_type"];

  return (
    (bucketType === "question" || bucketType === "mode" || bucketType === "skill" || bucketType === "error_type") &&
    isString(row["bucket_key"]) &&
    isFiniteNumber(row["attempts"]) &&
    isFiniteNumber(row["correct_count"]) &&
    isFiniteNumber(row["wrong_count"]) &&
    isFiniteNumber(row["session_count"]) &&
    (row["last_seen_at"] === null || isString(row["last_seen_at"]))
  );
}

export function normalizeQuizPedagogicalMetricRows(value: unknown): QuizPedagogicalMetricRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isValidMetricRow).map((row) => ({
    bucket_type: row["bucket_type"],
    bucket_key: row["bucket_key"],
    attempts: Math.max(0, Math.trunc(row["attempts"])),
    correct_count: Math.max(0, Math.trunc(row["correct_count"])),
    wrong_count: Math.max(0, Math.trunc(row["wrong_count"])),
    session_count: Math.max(0, Math.trunc(row["session_count"])),
    last_seen_at: row["last_seen_at"],
  }));
}

export function buildQuizPedagogicalMetricsSnapshot(
  rows: readonly QuizPedagogicalMetricRow[],
  questions: readonly QuizQuestion[],
): QuizPedagogicalMetricsSnapshot {
  const questionLookup = new Map(questions.map((question) => [question.id, normalizeQuestionLookup(question)] as const));
  const questionRows = rows.filter((row) => row.bucket_type === "question");
  const modeStats: QuizPedagogicalMetricsModeStat[] = QUIZ_ACCESS_TYPES.map((accessType) => {
    const row = rows.find((item) => item.bucket_type === "mode" && item.bucket_key === accessType.id);
    const attempts = row?.attempts ?? 0;
    const correctCount = row?.correct_count ?? 0;
    const wrongCount = row?.wrong_count ?? 0;

    return {
      id: accessType.id,
      label: accessType.label,
      sessions: row?.session_count ?? 0,
      attempts,
      correctCount,
      wrongCount,
      accuracy: getAccuracy(correctCount, attempts),
      lastSeenAt: row?.last_seen_at ?? null,
    };
  }).sort((left, right) => right.sessions - left.sessions || right.attempts - left.attempts || left.label.localeCompare(right.label, "fr"));

  const questionStats = questions
    .map((question) => {
      const base = questionLookup.get(question.id);
      const row = rows.find((item) => item.bucket_type === "question" && item.bucket_key === question.id);
      const attempts = row?.attempts ?? 0;
      const correctCount = row?.correct_count ?? 0;
      const wrongCount = row?.wrong_count ?? 0;
      const accuracy = getAccuracy(correctCount, attempts);
      const isTooEasy = attempts >= QUESTION_TOO_EASY_MIN_ATTEMPTS && accuracy >= QUESTION_TOO_EASY_THRESHOLD;
      const isTooHard = attempts >= QUESTION_TOO_HARD_MIN_ATTEMPTS && accuracy <= QUESTION_TOO_HARD_THRESHOLD;

      if (!base) {
        return null;
      }

      return {
        ...base,
        attempts,
        correctCount,
        wrongCount,
        accuracy,
        isTooEasy,
        isTooHard,
      };
    })
    .filter((value): value is QuizPedagogicalMetricsQuestionStat => value !== null)
    .sort((left, right) => right.attempts - left.attempts || left.question.localeCompare(right.question, "fr"));

  const easyQuestions = questionStats
    .filter((question) => question.isTooEasy)
    .sort((left, right) => right.accuracy - left.accuracy || right.attempts - left.attempts || left.question.localeCompare(right.question, "fr"))
    .slice(0, 6);

  const hardQuestions = questionStats
    .filter((question) => question.isTooHard)
    .sort((left, right) => left.accuracy - right.accuracy || right.attempts - left.attempts || left.question.localeCompare(right.question, "fr"))
    .slice(0, 6);

  const skillMap = new Map<QuizReasoningType, QuizPedagogicalMetricsSkillStat>();
  for (const question of questions) {
    const row = rows.find((item) => item.bucket_type === "skill" && item.bucket_key === (question.skill ?? question.reasoningType));
    if (!row) {
      continue;
    }

    const skill = question.skill ?? question.reasoningType;
    const current = skillMap.get(skill) ?? {
      skill,
      label: REASONING_TYPE_LABELS[skill],
      attempts: 0,
      correctCount: 0,
      wrongCount: 0,
      accuracy: 0,
      lastSeenAt: null,
    };

    current.attempts = row.attempts;
    current.correctCount = row.correct_count;
    current.wrongCount = row.wrong_count;
    current.accuracy = getAccuracy(row.correct_count, row.attempts);
    current.lastSeenAt = row.last_seen_at;
    skillMap.set(skill, current);
  }

  const weakSkills = Array.from(skillMap.values())
    .filter((skill) => skill.attempts >= SKILL_REVIEW_MIN_ATTEMPTS && skill.accuracy <= SKILL_REVIEW_THRESHOLD)
    .sort((left, right) => left.accuracy - right.accuracy || right.attempts - left.attempts || left.label.localeCompare(right.label, "fr"))
    .slice(0, 6);

  const frequentErrors = rows
    .filter((row) => row.bucket_type === "error_type" && row.wrong_count > 0)
    .map((row) => ({
      errorType: row.bucket_key,
      count: row.wrong_count,
      lastSeenAt: row.last_seen_at,
    }))
    .sort((left, right) => right.count - left.count || left.errorType.localeCompare(right.errorType, "fr"))
    .slice(0, 8);

  const totalAttempts = questionRows.reduce((sum, row) => sum + row.attempts, 0);
  const totalCorrect = questionRows.reduce((sum, row) => sum + row.correct_count, 0);
  const totalWrong = questionRows.reduce((sum, row) => sum + row.wrong_count, 0);

  return {
    totalAttempts,
    totalCorrect,
    totalWrong,
    overallAccuracy: getAccuracy(totalCorrect, totalAttempts),
    modeStats,
    questionStats,
    easyQuestions,
    hardQuestions,
    weakSkills,
    frequentErrors,
  };
}

export async function loadQuizPedagogicalMetricsSnapshot(
  questions: readonly QuizQuestion[],
): Promise<QuizPedagogicalMetricsSnapshot> {
  const supabase = getSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from("quiz_pedagogical_metrics")
      .select("bucket_type, bucket_key, attempts, correct_count, wrong_count, session_count, last_seen_at")
      .order("bucket_type", { ascending: true })
      .order("bucket_key", { ascending: true });

    if (error || !data) {
      return buildQuizPedagogicalMetricsSnapshot([], questions);
    }

    return buildQuizPedagogicalMetricsSnapshot(normalizeQuizPedagogicalMetricRows(data), questions);
  } catch {
    return buildQuizPedagogicalMetricsSnapshot([], questions);
  }
}

export async function syncQuizPedagogicalMetrics(
  supabase: SupabaseClient,
  session: QuizPedagogicalMetricsSession,
): Promise<void> {
  const rows = new Map<string, QuizPedagogicalMetricRow>();
  const sessionTimestamp = session.playedAt;

  const upsertRow = (bucketType: QuizPedagogicalMetricBucketType, bucketKey: string, delta: Partial<QuizPedagogicalMetricRow> & { attempts?: number; correct_count?: number; wrong_count?: number; session_count?: number }) => {
    const key = `${bucketType}:${bucketKey}`;
    const current = rows.get(key) ?? {
      bucket_type: bucketType,
      bucket_key: bucketKey,
      attempts: 0,
      correct_count: 0,
      wrong_count: 0,
      session_count: 0,
      last_seen_at: sessionTimestamp,
    };

    current.attempts += delta.attempts ?? 0;
    current.correct_count += delta.correct_count ?? 0;
    current.wrong_count += delta.wrong_count ?? 0;
    current.session_count += delta.session_count ?? 0;
    current.last_seen_at = sessionTimestamp;
    rows.set(key, current);
  };

  upsertRow("mode", session.mode, {
    attempts: session.totalQuestions,
    correct_count: session.score,
    wrong_count: Math.max(0, session.totalQuestions - session.score),
    session_count: 1,
  });

  for (const question of session.questions) {
    upsertRow("question", question.questionId, {
      attempts: 1,
      correct_count: question.correct ? 1 : 0,
      wrong_count: question.correct ? 0 : 1,
    });

    upsertRow("skill", question.skill, {
      attempts: 1,
      correct_count: question.correct ? 1 : 0,
      wrong_count: question.correct ? 0 : 1,
    });

    if (!question.correct && question.errorType) {
      upsertRow("error_type", question.errorType, {
        attempts: 1,
        wrong_count: 1,
      });
    }
  }

  const payload = Array.from(rows.values()).map((row) => ({
    bucket_type: row.bucket_type,
    bucket_key: row.bucket_key,
    attempts: row.attempts,
    correct_count: row.correct_count,
    wrong_count: row.wrong_count,
    session_count: row.session_count,
    last_seen_at: row.last_seen_at,
  }));

  if (payload.length === 0) {
    return;
  }

  for (const row of payload) {
    const { error } = await supabase.rpc("increment_quiz_pedagogical_metric", {
      p_bucket_type: row.bucket_type,
      p_bucket_key: row.bucket_key,
      p_attempts: row.attempts,
      p_correct_count: row.correct_count,
      p_wrong_count: row.wrong_count,
      p_session_count: row.session_count,
      p_last_seen_at: row.last_seen_at,
    });

    if (error) {
      throw error;
    }
  }
}

export function summarizeQuizPedagogicalMetrics(snapshot: QuizPedagogicalMetricsSnapshot): {
  tooEasyCount: number;
  tooHardCount: number;
  weakSkillCount: number;
  frequentErrorCount: number;
} {
  return {
    tooEasyCount: snapshot.easyQuestions.length,
    tooHardCount: snapshot.hardQuestions.length,
    weakSkillCount: snapshot.weakSkills.length,
    frequentErrorCount: snapshot.frequentErrors.length,
  };
}
