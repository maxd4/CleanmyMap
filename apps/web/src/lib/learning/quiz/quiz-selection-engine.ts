import type { SRSStats } from "@/lib/gamification/quiz-srs";
import {
  getQuizStateFromStats,
  type CognitiveQuizStateId,
} from "@/lib/learning/cognitive-principles";
import {
  getQuizAccessType,
  matchesQuizAccessType,
  type QuizAccessTypeId,
} from "./quiz-access-types";
import type { QuizReasoningType } from "./quiz-reasoning-types";
import type { QuizQuestionCategory } from "@/lib/learning/quiz/quiz-question-categories";
import {
  getQuizDifficulty,
  getQuizDifficultyIndex,
  getQuizPedagogicalType,
  getQuizPedagogicalTypeIndex,
  getQuizSkill,
  type QuizDifficultyId,
  type QuizPedagogicalTypeId,
  type QuizSkillId,
} from "@/lib/learning/quiz/quiz-taxonomy";
import {
  getQuizTrapLevel,
  matchesQuizTrapLevel,
  type QuizTrapLevelId,
} from "./quiz-trap-levels";
import {
  QUIZ_SCHOOL_TRACK_QUESTION_IDS,
  QUIZ_SCHOOL_SESSION_SIZE,
  QUIZ_SCHOOL_TRACK_ORDER,
  getQuizSchoolTrackId,
  type QuizSchoolLevel,
  type QuizSchoolQuestionLevelProfile,
  type QuizSchoolTrackId,
} from "./quiz-school-types";
import type { QuizSchoolQuestionEligibility } from "./quiz-school-types";

export type QuizSelectionQuestionLike = {
  id: string;
  category: QuizQuestionCategory;
  reasoningType: QuizReasoningType;
  type: "multiple-choice" | "multiple-select" | "true-false" | "flashcard";
  format?: QuizPedagogicalTypeId;
  pedagogicalType?: QuizPedagogicalTypeId;
  skill?: QuizSkillId;
  difficulty?: QuizDifficultyId;
  trapLevel?: QuizTrapLevelId;
  trackId?: QuizSchoolTrackId;
  schoolEligibility?: QuizSchoolQuestionEligibility;
  needsReview?: boolean;
};

export type QuizSelectionOptions = {
  accessTypeId: QuizAccessTypeId;
  mode?: QuizAccessTypeId;
  trapLevel?: QuizTrapLevelId | null;
  reasoningType?: QuizReasoningType | null;
  schoolTrack?: QuizSchoolTrackId | null;
  schoolLevel?: QuizSchoolLevel | null;
  sessionSize?: number;
  shuffleSession?: boolean;
  randomizer?: () => number;
  now?: Date;
};

const DEFAULT_SESSION_SIZE_BY_MODE: Record<QuizAccessTypeId, number> = {
  mixte: 10,
  ecole: QUIZ_SCHOOL_SESSION_SIZE,
  terrain: 8,
  "donnees-scientifiques": 8,
  sensibilisation: 8,
  "habitudes-de-vie": 8,
  "ordres-de-grandeur": 8,
  "tri-securite": 8,
};

const DEMO_SESSION_QUESTION_IDS = ["at8", "e1", "cb5", "at12", "cb17"] as const;

const SCHOOL_LEVEL_DIFFICULTY_ORDER: Record<QuizSchoolLevel, readonly ("low" | "medium" | "high")[]> = {
  "6e": ["low", "medium", "high"],
  "5e": ["low", "medium", "high"],
  "4e": ["medium", "low", "high"],
  "3e": ["medium", "high", "low"],
};

export function getDefaultQuizSessionSize(mode: QuizAccessTypeId): number {
  return DEFAULT_SESSION_SIZE_BY_MODE[mode];
}

export function buildQuizDemoSessionDeck<T extends QuizSelectionQuestionLike>(questions: readonly T[]): T[] {
  const questionById = new Map(questions.map((question) => [question.id, question] as const));
  return DEMO_SESSION_QUESTION_IDS.map((questionId) => questionById.get(questionId)).filter(
    (question): question is T => Boolean(question),
  );
}

export function buildQuizSchoolSessionDeck<T extends QuizSelectionQuestionLike>(
  questions: readonly T[],
  levelOrLegacyTrack: QuizSchoolLevel | QuizSchoolTrackId,
  sessionSize = DEFAULT_SESSION_SIZE_BY_MODE.ecole,
): T[] {
  const questionById = new Map(questions.map((question) => [question.id, question] as const));
  if (QUIZ_SCHOOL_TRACK_ORDER.includes(levelOrLegacyTrack as QuizSchoolTrackId)) {
    const legacyTrack = levelOrLegacyTrack as QuizSchoolTrackId;
    return QUIZ_SCHOOL_TRACK_QUESTION_IDS[legacyTrack]
      .map((questionId) => questionById.get(questionId))
      .filter((question): question is T => Boolean(question))
      .slice(0, sessionSize);
  }

  const level = levelOrLegacyTrack as QuizSchoolLevel;
  const difficultyOrder = SCHOOL_LEVEL_DIFFICULTY_ORDER[level];
  const difficultyRank = new Map(difficultyOrder.map((difficulty, index) => [difficulty, index] as const));
  const candidatesByTrack = QUIZ_SCHOOL_TRACK_ORDER.map((track) =>
    questions
      .filter((question) => !question.needsReview && getResolvedSchoolTrack(question) === track)
      .filter((question) => Boolean(getSchoolLevelProfile(question, level)))
      .sort((left, right) => {
        const leftProfile = getSchoolLevelProfile(left, level);
        const rightProfile = getSchoolLevelProfile(right, level);
        const leftRank = difficultyRank.get(leftProfile?.difficulty ?? getResolvedDifficulty(left)) ?? difficultyOrder.length;
        const rightRank = difficultyRank.get(rightProfile?.difficulty ?? getResolvedDifficulty(right)) ?? difficultyOrder.length;
        const leftSkill = leftProfile?.skills.join(",") ?? getResolvedSkill(left);
        const rightSkill = rightProfile?.skills.join(",") ?? getResolvedSkill(right);
        return leftRank - rightRank || leftSkill.localeCompare(rightSkill, "fr") || left.id.localeCompare(right.id, "fr");
      }),
  );

  const ordered = weaveBuckets(candidatesByTrack);
  const seenQuestionIds = new Set<string>();
  const uniqueOrdered = ordered.filter((question) => {
    if (seenQuestionIds.has(question.id)) {
      return false;
    }

    seenQuestionIds.add(question.id);
    return true;
  });

  if (uniqueOrdered.length < sessionSize) {
    const fallbackQuestions = [...questions]
      .filter((question) => {
        return (
          !question.needsReview &&
          Boolean(getResolvedSchoolTrack(question)) &&
          Boolean(getSchoolLevelProfile(question, level)) &&
          !seenQuestionIds.has(question.id)
        );
      })
      .sort((left, right) => {
        const leftProfile = getSchoolLevelProfile(left, level);
        const rightProfile = getSchoolLevelProfile(right, level);
        const leftRank = difficultyRank.get(leftProfile?.difficulty ?? getResolvedDifficulty(left)) ?? difficultyOrder.length;
        const rightRank = difficultyRank.get(rightProfile?.difficulty ?? getResolvedDifficulty(right)) ?? difficultyOrder.length;
        return leftRank - rightRank || left.id.localeCompare(right.id, "fr");
      });

    uniqueOrdered.push(...fallbackQuestions.slice(0, sessionSize - uniqueOrdered.length));
  }

  return uniqueOrdered.slice(0, sessionSize);
}

function getResolvedSchoolTrack(question: QuizSelectionQuestionLike): QuizSchoolTrackId | undefined {
  return question.trackId ?? getQuizSchoolTrackId(question.id);
}

function getSchoolLevelProfile(
  question: QuizSelectionQuestionLike,
  level: QuizSchoolLevel,
): QuizSchoolQuestionLevelProfile | undefined {
  const explicitProfile = question.schoolEligibility?.[level];
  if (explicitProfile) {
    return explicitProfile;
  }

  const difficulty = getResolvedDifficulty(question);
  const isAllowed = level === "6e" ? difficulty === "low" : level === "3e" || difficulty !== "high";
  return isAllowed
    ? {
        difficulty,
        skills: [getResolvedSkill(question)],
      }
    : undefined;
}

const STATE_PRIORITY: Record<CognitiveQuizStateId, number> = {
  failed: 0,
  due: 1,
  new: 2,
  mastered: 3,
};

const MODE_TRAP_SEQUENCE: Record<QuizAccessTypeId, readonly QuizTrapLevelId[]> = {
  mixte: ["low", "medium", "high"],
  ecole: ["low", "medium", "high"],
  terrain: ["low", "medium", "high"],
  "donnees-scientifiques": ["low", "medium", "high"],
  sensibilisation: ["low", "medium", "high"],
  "habitudes-de-vie": ["low", "medium", "high"],
  "ordres-de-grandeur": ["low", "medium", "high"],
  "tri-securite": ["low", "medium", "high"],
};

function getSelectedMode(options: QuizSelectionOptions): QuizAccessTypeId {
  return options.mode ?? options.accessTypeId;
}

function getTrapLevelIndex(mode: QuizAccessTypeId, trapLevel: QuizTrapLevelId): number {
  const sequence = MODE_TRAP_SEQUENCE[mode];
  const index = sequence.indexOf(trapLevel);
  return index === -1 ? sequence.length : index;
}

function getReasoningIndex(mode: QuizAccessTypeId, reasoningType: QuizReasoningType): number {
  const sequence = getQuizAccessType(mode).reasoningTypes;
  const index = sequence.indexOf(reasoningType);
  return index === -1 ? sequence.length : index;
}

function getCategoryIndex(mode: QuizAccessTypeId, category: QuizQuestionCategory): number {
  const sequence = getQuizAccessType(mode).categories;
  const index = sequence.indexOf(category);
  return index === -1 ? sequence.length : index;
}

function getSRSReviewTime(stats: SRSStats | undefined, now: Date): number {
  if (!stats) {
    return now.getTime();
  }

  return new Date(stats.next_review_at).getTime();
}

function getResolvedSkill(question: QuizSelectionQuestionLike): QuizSkillId {
  return question.skill ?? getQuizSkill(question);
}

function getResolvedPedagogicalType(question: QuizSelectionQuestionLike): QuizPedagogicalTypeId {
  return question.pedagogicalType ?? question.format ?? getQuizPedagogicalType(question);
}

function getResolvedDifficulty(question: QuizSelectionQuestionLike): QuizDifficultyId {
  return question.difficulty ?? getQuizDifficulty(question);
}

function compareQuestionsWithinBucket<T extends QuizSelectionQuestionLike>(
  left: T,
  right: T,
  mode: QuizAccessTypeId,
  statsByQuestionId: Record<string, SRSStats>,
  now: Date,
): number {
  const leftDifficulty = getQuizDifficultyIndex(getResolvedDifficulty(left));
  const rightDifficulty = getQuizDifficultyIndex(getResolvedDifficulty(right));
  if (leftDifficulty !== rightDifficulty) {
    return leftDifficulty - rightDifficulty;
  }

  const leftTrap = getTrapLevelIndex(mode, getQuizTrapLevel(left));
  const rightTrap = getTrapLevelIndex(mode, getQuizTrapLevel(right));
  if (leftTrap !== rightTrap) {
    return leftTrap - rightTrap;
  }

  const leftCategory = getCategoryIndex(mode, left.category);
  const rightCategory = getCategoryIndex(mode, right.category);
  if (leftCategory !== rightCategory) {
    return leftCategory - rightCategory;
  }

  const leftReview = getSRSReviewTime(statsByQuestionId[left.id], now);
  const rightReview = getSRSReviewTime(statsByQuestionId[right.id], now);
  if (leftReview !== rightReview) {
    return leftReview - rightReview;
  }

  return left.id.localeCompare(right.id, "fr");
}

function compareBucketScore(
  leftScore: readonly number[],
  rightScore: readonly number[],
  leftLabel: string,
  rightLabel: string,
): number {
  for (let index = 0; index < leftScore.length; index += 1) {
    if (leftScore[index] !== rightScore[index]) {
      return leftScore[index] - rightScore[index];
    }
  }

  return leftLabel.localeCompare(rightLabel, "fr");
}

function bucketize<T extends QuizSelectionQuestionLike, K extends string>(
  items: readonly T[],
  getKey: (item: T) => K,
): Array<{ key: K; bucket: T[] }> {
  const buckets = new Map<K, T[]>();

  items.forEach((item) => {
    const key = getKey(item);
    const bucket = buckets.get(key) ?? [];
    bucket.push(item);
    buckets.set(key, bucket);
  });

  return Array.from(buckets.entries()).map(([key, bucket]) => ({ key, bucket }));
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

function shuffleArray<T>(items: readonly T[], randomizer: () => number): T[] {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(randomizer() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
}

function orderPedagogicalBuckets<T extends QuizSelectionQuestionLike>(
  questions: readonly T[],
  mode: QuizAccessTypeId,
  statsByQuestionId: Record<string, SRSStats>,
  now: Date,
): T[][] {
  return bucketize(questions, getResolvedPedagogicalType)
    .map(({ key, bucket }) => {
      const sortedBucket = [...bucket].sort((left, right) =>
        compareQuestionsWithinBucket(left, right, mode, statsByQuestionId, now),
      );
      const head = sortedBucket[0];
      const score = [
        getQuizPedagogicalTypeIndex(key),
        head ? getQuizDifficultyIndex(getResolvedDifficulty(head)) : 99,
        head ? getTrapLevelIndex(mode, getQuizTrapLevel(head)) : 99,
        head ? getCategoryIndex(mode, head.category) : 99,
        -sortedBucket.length,
      ] as const;

      return { key, bucket: sortedBucket, score };
    })
    .sort((left, right) => compareBucketScore(left.score, right.score, left.key, right.key))
    .map((entry) => entry.bucket);
}

function orderSkillBuckets<T extends QuizSelectionQuestionLike>(
  questions: readonly T[],
  mode: QuizAccessTypeId,
  statsByQuestionId: Record<string, SRSStats>,
  now: Date,
): T[][] {
  return bucketize(questions, getResolvedSkill)
    .map(({ key, bucket }) => {
      const pedagogicalBuckets = orderPedagogicalBuckets(bucket, mode, statsByQuestionId, now);
      const orderedBucket = weaveBuckets(pedagogicalBuckets);
      const head = orderedBucket[0];
      const score = [
        getReasoningIndex(mode, key),
        head ? getQuizDifficultyIndex(getResolvedDifficulty(head)) : 99,
        head ? getTrapLevelIndex(mode, getQuizTrapLevel(head)) : 99,
        head ? getCategoryIndex(mode, head.category) : 99,
        -orderedBucket.length,
      ] as const;

      return { key, bucket: orderedBucket, score };
    })
    .sort((left, right) => compareBucketScore(left.score, right.score, left.key, right.key))
    .map((entry) => entry.bucket);
}

function buildOrderedModeDeck<T extends QuizSelectionQuestionLike>(
  questions: readonly T[],
  mode: QuizAccessTypeId,
  statsByQuestionId: Record<string, SRSStats>,
  now: Date,
): T[] {
  const stateBuckets = bucketize(questions, (question) => getQuizStateFromStats(statsByQuestionId[question.id], now));
  const ordered: T[] = [];

  (Object.keys(STATE_PRIORITY) as CognitiveQuizStateId[])
    .sort((left, right) => STATE_PRIORITY[left] - STATE_PRIORITY[right])
    .forEach((state) => {
      const bucket = stateBuckets.find((entry) => entry.key === state)?.bucket;
      if (!bucket || bucket.length === 0) {
        return;
      }

      const skillBuckets = orderSkillBuckets(bucket, mode, statsByQuestionId, now);
      ordered.push(...weaveBuckets(skillBuckets));
    });

  return ordered;
}

export function buildQuizSessionDeck<T extends QuizSelectionQuestionLike>(
  questions: readonly T[],
  statsByQuestionId: Record<string, SRSStats>,
  options: QuizSelectionOptions,
): T[] {
  const now = options.now ?? new Date();
  const selectedMode = getSelectedMode(options);

  if (selectedMode === "ecole") {
    const schoolSelection = options.schoolLevel ?? options.schoolTrack;
    if (!schoolSelection) {
      return [];
    }

    return buildQuizSchoolSessionDeck(
      questions,
      schoolSelection,
      options.sessionSize ?? DEFAULT_SESSION_SIZE_BY_MODE.ecole,
    );
  }

  const filteredQuestions = questions.filter((question) => {
    if (!matchesQuizAccessType(selectedMode, question)) {
      return false;
    }

    if (!matchesQuizTrapLevel(options.trapLevel ?? null, question)) {
      return false;
    }

    if (options.reasoningType && getResolvedSkill(question) !== options.reasoningType) {
      return false;
    }

    return true;
  });

  if (filteredQuestions.length <= 1) {
    return [...filteredQuestions];
  }

  const sessionSize = options.sessionSize ?? DEFAULT_SESSION_SIZE_BY_MODE[selectedMode];
  const orderedDeck = buildOrderedModeDeck(filteredQuestions, selectedMode, statsByQuestionId, now).slice(0, sessionSize);

  if (!options.shuffleSession) {
    return orderedDeck;
  }

  return shuffleArray(orderedDeck, options.randomizer ?? Math.random);
}
