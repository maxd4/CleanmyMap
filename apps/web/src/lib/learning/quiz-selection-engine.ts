import type { SRSStats } from "@/lib/gamification/quiz-srs";
import {
  getQuizStateFromStats,
  type CognitiveQuizStateId,
} from "@/lib/learning/cognitive-principles";
import {
  getQuizAccessType,
  matchesQuizAccessType,
  type QuizAccessTypeId,
} from "@/components/learn/quiz-access-types";
import type { QuizReasoningType } from "@/components/learn/quiz-reasoning-types";
import type { QuizQuestionCategory } from "@/components/learn/quiz-review-targets";
import type { QuizQuestionFormatId } from "@/components/learn/quiz-question-formats";
import {
  QUIZ_TRAP_LEVELS,
  getQuizTrapLevel,
  matchesQuizTrapLevel,
  type QuizTrapLevelId,
} from "@/components/learn/quiz-trap-levels";

export type QuizSelectionQuestionLike = {
  id: string;
  category: QuizQuestionCategory;
  reasoningType: QuizReasoningType;
  type: "multiple-choice" | "true-false" | "flashcard";
  format?: QuizQuestionFormatId;
  trapLevel?: QuizTrapLevelId;
};

export type QuizSelectionOptions = {
  accessTypeId: QuizAccessTypeId;
  trapLevel?: QuizTrapLevelId | null;
  reasoningType?: QuizReasoningType | null;
  sessionSize?: number;
  now?: Date;
};

const DEFAULT_SESSION_SIZE_BY_MODE: Record<QuizAccessTypeId, number> = {
  mixte: 10,
  terrain: 8,
  "donnees-scientifiques": 8,
  sensibilisation: 8,
  "habitudes-de-vie": 8,
  "ordres-de-grandeur": 8,
  "tri-securite": 8,
};

const STATE_PRIORITY: Record<CognitiveQuizStateId, number> = {
  failed: 0,
  due: 1,
  new: 2,
  mastered: 3,
};

const MODE_TRAP_SEQUENCE: Record<QuizAccessTypeId, readonly QuizTrapLevelId[]> = {
  mixte: ["low", "medium", "high"],
  terrain: ["low", "medium", "high"],
  "donnees-scientifiques": ["low", "medium", "high"],
  sensibilisation: ["low", "medium", "high"],
  "habitudes-de-vie": ["low", "medium", "high"],
  "ordres-de-grandeur": ["low", "medium", "high"],
  "tri-securite": ["low", "medium", "high"],
};

const FORMAT_PRIORITY_SEQUENCE: readonly string[] = [
  "vrai-faux-piegeux",
  "situations-terrain",
  "questions-contre-intuitives",
  "estimations",
  "comparaisons",
  "classements",
  "mini-enquetes",
  "cas-limites",
  "mythes-et-realites",
  "consequences-indirectes",
  "multiple-choice",
  "flashcard",
];

function getTrapLevelIndex(
  accessTypeId: QuizAccessTypeId,
  trapLevel: QuizTrapLevelId,
): number {
  const sequence = MODE_TRAP_SEQUENCE[accessTypeId];
  const index = sequence.indexOf(trapLevel);
  return index === -1 ? sequence.length : index;
}

function getReasoningIndex(
  accessTypeId: QuizAccessTypeId,
  reasoningType: QuizReasoningType,
): number {
  const sequence = getQuizAccessType(accessTypeId).reasoningTypes;
  const index = sequence.indexOf(reasoningType);
  return index === -1 ? sequence.length : index;
}

function getCategoryIndex(
  accessTypeId: QuizAccessTypeId,
  category: QuizQuestionCategory,
): number {
  const sequence = getQuizAccessType(accessTypeId).categories;
  const index = sequence.indexOf(category);
  return index === -1 ? sequence.length : index;
}

function getFormatKey(question: QuizSelectionQuestionLike): string {
  return question.format ?? question.type;
}

function getFormatIndex(
  formatKey: string,
): number {
  const index = FORMAT_PRIORITY_SEQUENCE.indexOf(formatKey);
  return index === -1 ? FORMAT_PRIORITY_SEQUENCE.length : index;
}

function getSRSReviewTime(stats: SRSStats | undefined, now: Date): number {
  if (!stats) {
    return now.getTime();
  }

  return new Date(stats.next_review_at).getTime();
}

function compareQuestionPriority<T extends QuizSelectionQuestionLike>(
  left: T,
  right: T,
  accessTypeId: QuizAccessTypeId,
  statsByQuestionId: Record<string, SRSStats>,
  now: Date,
): number {
  const leftStats = statsByQuestionId[left.id];
  const rightStats = statsByQuestionId[right.id];

  const leftState = getQuizStateFromStats(leftStats, now);
  const rightState = getQuizStateFromStats(rightStats, now);
  const stateDiff = STATE_PRIORITY[leftState] - STATE_PRIORITY[rightState];
  if (stateDiff !== 0) {
    return stateDiff;
  }

  const leftTrapLevel = getQuizTrapLevel(left);
  const rightTrapLevel = getQuizTrapLevel(right);
  const trapDiff = getTrapLevelIndex(accessTypeId, leftTrapLevel) - getTrapLevelIndex(accessTypeId, rightTrapLevel);
  if (trapDiff !== 0) {
    return trapDiff;
  }

  const leftReasoningDiff = getReasoningIndex(accessTypeId, left.reasoningType);
  const rightReasoningDiff = getReasoningIndex(accessTypeId, right.reasoningType);
  if (leftReasoningDiff !== rightReasoningDiff) {
    return leftReasoningDiff - rightReasoningDiff;
  }

  const leftCategoryDiff = getCategoryIndex(accessTypeId, left.category);
  const rightCategoryDiff = getCategoryIndex(accessTypeId, right.category);
  if (leftCategoryDiff !== rightCategoryDiff) {
    return leftCategoryDiff - rightCategoryDiff;
  }

  const leftFormatKey = getFormatKey(left);
  const rightFormatKey = getFormatKey(right);
  const leftFormatDiff = getFormatIndex(leftFormatKey);
  const rightFormatDiff = getFormatIndex(rightFormatKey);
  if (leftFormatDiff !== rightFormatDiff) {
    return leftFormatDiff - rightFormatDiff;
  }

  const reviewDiff = getSRSReviewTime(leftStats, now) - getSRSReviewTime(rightStats, now);
  if (reviewDiff !== 0) {
    return reviewDiff;
  }

  return left.id.localeCompare(right.id, "fr");
}

function sortCategoryBuckets<T extends QuizSelectionQuestionLike>(
  questions: readonly T[],
  accessTypeId: QuizAccessTypeId,
  statsByQuestionId: Record<string, SRSStats>,
  now: Date,
): T[][] {
  const buckets = new Map<QuizQuestionCategory, T[]>();

  questions.forEach((question) => {
    const bucket = buckets.get(question.category) ?? [];
    bucket.push(question);
    buckets.set(question.category, bucket);
  });

  const orderedBuckets = Array.from(buckets.entries())
    .map(([category, bucket]) => {
      const sortedBucket = [...bucket].sort((left, right) =>
        compareQuestionPriority(left, right, accessTypeId, statsByQuestionId, now),
      );

      const bucketHead = sortedBucket[0];
      const headState = bucketHead ? STATE_PRIORITY[getQuizStateFromStats(statsByQuestionId[bucketHead.id], now)] : 99;
      const headTrap = bucketHead ? getTrapLevelIndex(accessTypeId, getQuizTrapLevel(bucketHead)) : 99;
      const headReasoning = bucketHead ? getReasoningIndex(accessTypeId, bucketHead.reasoningType) : 99;
      const headFormat = bucketHead ? getFormatIndex(getFormatKey(bucketHead)) : 99;
      const categoryIndex = getCategoryIndex(accessTypeId, category);
      const dueCount = bucket.reduce((count, item) => {
        const state = getQuizStateFromStats(statsByQuestionId[item.id], now);
        return count + (state === "failed" || state === "due" ? 1 : 0);
      }, 0);

      return {
        category,
        bucket: sortedBucket,
        bucketScore: [
          headState,
          categoryIndex,
          headTrap,
          headReasoning,
          headFormat,
          -dueCount,
          -sortedBucket.length,
        ] as const,
      };
    })
    .sort((left, right) => {
      for (let index = 0; index < left.bucketScore.length; index += 1) {
        if (left.bucketScore[index] !== right.bucketScore[index]) {
          return left.bucketScore[index] - right.bucketScore[index];
        }
      }

      return left.category.localeCompare(right.category, "fr");
    });

  return orderedBuckets.map((entry) => entry.bucket);
}

function weaveBuckets<T>(buckets: T[][]): T[] {
  const workingBuckets = buckets.map((bucket) => [...bucket]);
  const ordered: T[] = [];

  let hasRemaining = true;
  while (hasRemaining) {
    hasRemaining = false;

    for (const bucket of workingBuckets) {
      const nextQuestion = bucket.shift();
      if (nextQuestion) {
        ordered.push(nextQuestion);
        hasRemaining = true;
      }
    }
  }

  return ordered;
}

function buildFocusedModeDeck<T extends QuizSelectionQuestionLike>(
  questions: readonly T[],
  accessTypeId: QuizAccessTypeId,
  statsByQuestionId: Record<string, SRSStats>,
  now: Date,
): T[] {
  const trapSequence = MODE_TRAP_SEQUENCE[accessTypeId];
  const trapOrder = trapSequence.filter((trapLevel) =>
    questions.some((question) => getQuizTrapLevel(question) === trapLevel),
  );

  const remainingTraps = QUIZ_TRAP_LEVELS.map((trapLevel) => trapLevel.id).filter(
    (trapLevel) => !trapOrder.includes(trapLevel) && questions.some((question) => getQuizTrapLevel(question) === trapLevel),
  );

  const ordered: T[] = [];

  [...trapOrder, ...remainingTraps].forEach((trapLevel) => {
    const trapQuestions = questions.filter((question) => getQuizTrapLevel(question) === trapLevel);
    if (trapQuestions.length === 0) {
      return;
    }

    const bucketOrder = sortCategoryBuckets(trapQuestions, accessTypeId, statsByQuestionId, now);
    ordered.push(...weaveBuckets(bucketOrder));
  });

  return ordered;
}

function buildMixedModeDeck<T extends QuizSelectionQuestionLike>(
  questions: readonly T[],
  statsByQuestionId: Record<string, SRSStats>,
  now: Date,
): T[] {
  if (questions.length <= 1) {
    return [...questions];
  }

  const stateBuckets = new Map<CognitiveQuizStateId, T[]>();
  questions.forEach((question) => {
    const state = getQuizStateFromStats(statsByQuestionId[question.id], now);
    const bucket = stateBuckets.get(state) ?? [];
    bucket.push(question);
    stateBuckets.set(state, bucket);
  });

  const ordered: T[] = [];
  (Object.keys(STATE_PRIORITY) as CognitiveQuizStateId[])
    .sort((left, right) => STATE_PRIORITY[left] - STATE_PRIORITY[right])
    .forEach((state) => {
      const bucket = stateBuckets.get(state);
      if (!bucket || bucket.length === 0) {
        return;
      }

      const categoryBuckets = sortCategoryBuckets(bucket, "mixte", statsByQuestionId, now);
      ordered.push(...weaveBuckets(categoryBuckets));
    });

  return ordered;
}

export function buildQuizSessionDeck<T extends QuizSelectionQuestionLike>(
  questions: readonly T[],
  statsByQuestionId: Record<string, SRSStats>,
  options: QuizSelectionOptions,
): T[] {
  const now = options.now ?? new Date();
  const filteredQuestions = questions.filter((question) => {
    if (!matchesQuizAccessType(options.accessTypeId, question)) {
      return false;
    }

    if (!matchesQuizTrapLevel(options.trapLevel ?? null, question)) {
      return false;
    }

    if (options.reasoningType && question.reasoningType !== options.reasoningType) {
      return false;
    }

    return true;
  });

  if (filteredQuestions.length <= 1) {
    return [...filteredQuestions];
  }

  const sessionSize = options.sessionSize ?? DEFAULT_SESSION_SIZE_BY_MODE[options.accessTypeId];

  if (options.accessTypeId === "mixte") {
    return buildMixedModeDeck(filteredQuestions, statsByQuestionId, now).slice(0, sessionSize);
  }

  return buildFocusedModeDeck(filteredQuestions, options.accessTypeId, statsByQuestionId, now).slice(0, sessionSize);
}
