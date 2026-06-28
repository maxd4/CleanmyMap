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
import {
  getQuizDifficulty,
  getQuizDifficultyIndex,
  getQuizPedagogicalType,
  getQuizPedagogicalTypeIndex,
  getQuizSkill,
  type QuizDifficultyId,
  type QuizPedagogicalTypeId,
  type QuizSkillId,
} from "@/lib/learning/quiz-taxonomy";
import {
  getQuizTrapLevel,
  matchesQuizTrapLevel,
  type QuizTrapLevelId,
} from "@/components/learn/quiz-trap-levels";
import type { QuizSchoolTrackId } from "@/components/learn/quiz-school-modes";

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
};

export type QuizSelectionOptions = {
  accessTypeId: QuizAccessTypeId;
  mode?: QuizAccessTypeId;
  trapLevel?: QuizTrapLevelId | null;
  reasoningType?: QuizReasoningType | null;
  schoolTrack?: QuizSchoolTrackId | null;
  sessionSize?: number;
  shuffleSession?: boolean;
  randomizer?: () => number;
  now?: Date;
};

const DEFAULT_SESSION_SIZE_BY_MODE: Record<QuizAccessTypeId, number> = {
  mixte: 10,
  ecole: 15,
  terrain: 8,
  "donnees-scientifiques": 8,
  sensibilisation: 8,
  "habitudes-de-vie": 8,
  "ordres-de-grandeur": 8,
  "tri-securite": 8,
};

const DEMO_SESSION_QUESTION_IDS = ["at8", "e1", "cb5", "at12", "cb17"] as const;

const SCHOOL_SESSION_QUESTION_IDS: Record<QuizSchoolTrackId, readonly string[]> = {
  "debat-classe": ["e1", "e2", "e3", "n1", "n2", "n5", "v4", "v5", "v3", "im1", "im4", "im5", "im6", "im9", "hb2"],
  "mission-terrain": ["at7", "at8", "at9", "at10", "at11", "at12", "at13", "at14", "at15", "at16", "at17", "at18", "at19", "at20", "at21"],
  "ordres-de-grandeur": ["n2", "cb5", "cb6", "i3", "i4", "i7", "i8", "v1", "v2", "v3", "v5", "x3", "x4", "im3", "im8"],
  "gestes-du-quotidien": ["ec1", "ec2", "hb1", "hb2", "co1", "im6", "im11", "im12", "im13", "im14", "im15", "im16", "im17", "rc1", "rc2"],
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
  track: QuizSchoolTrackId,
  sessionSize = DEFAULT_SESSION_SIZE_BY_MODE.ecole,
): T[] {
  const questionById = new Map(questions.map((question) => [question.id, question] as const));
  const ordered = SCHOOL_SESSION_QUESTION_IDS[track]
    .map((questionId) => questionById.get(questionId))
    .filter((question): question is T => Boolean(question));

  return ordered.slice(0, sessionSize);
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
    const schoolTrack = options.schoolTrack;
    if (!schoolTrack) {
      return [];
    }

    return buildQuizSchoolSessionDeck(questions, schoolTrack, options.sessionSize ?? DEFAULT_SESSION_SIZE_BY_MODE.ecole);
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
