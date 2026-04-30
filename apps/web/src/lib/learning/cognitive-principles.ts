import type { SRSStats } from "@/lib/gamification/quiz-srs";

export type SupportedLocale = "fr" | "en";

export type CognitiveRubricId =
  | "quiz"
  | "learn"
  | "impact"
  | "actions"
  | "reports"
  | "network";

export type CognitiveQuizStateId = "new" | "failed" | "due" | "mastered";

export type CognitiveRubricSpec = {
  id: CognitiveRubricId;
  label: Record<SupportedLocale, string>;
  principle: Record<SupportedLocale, string>;
  summary: Record<SupportedLocale, string>;
};

export type CognitiveMicroRecallSpec = {
  id: "feedback" | "review" | "tomorrow";
  label: Record<SupportedLocale, string>;
  summary: Record<SupportedLocale, string>;
};

export type CognitiveQuizSummary = {
  counts: Record<CognitiveQuizStateId, number>;
  total: number;
  nextReviewAt: string | null;
};

export type CognitiveQuizQuestionLike = {
  id: string;
  category: string;
};

export const COGNITIVE_QUIZ_STATE_LABELS: Record<
  SupportedLocale,
  Record<CognitiveQuizStateId, string>
> = {
  fr: {
    new: "Nouvelles",
    failed: "Échouées",
    due: "À revoir",
    mastered: "Maîtrisées",
  },
  en: {
    new: "New",
    failed: "Failed",
    due: "To review",
    mastered: "Mastered",
  },
};

export const COGNITIVE_RUBRICS: CognitiveRubricSpec[] = [
  {
    id: "quiz",
    label: { fr: "Quiz", en: "Quiz" },
    principle: { fr: "Pratique de récupération", en: "Retrieval practice" },
    summary: {
      fr: "Réactiver la mémoire avec des questions mélangées et un retour immédiat.",
      en: "Re-activate memory with mixed questions and immediate feedback.",
    },
  },
  {
    id: "learn",
    label: { fr: "Apprendre", en: "Learn" },
    principle: { fr: "Curiosité", en: "Curiosity" },
    summary: {
      fr: "Ouvrir chaque sujet par un contraste, une question ou une surprise utile.",
      en: "Open each topic with contrast, a question, or a useful surprise.",
    },
  },
  {
    id: "impact",
    label: { fr: "Impact", en: "Impact" },
    principle: { fr: "Consolidation", en: "Consolidation" },
    summary: {
      fr: "Montrer ce qui a vraiment bougé et ce qui reste à renforcer.",
      en: "Show what actually changed and what still needs reinforcement.",
    },
  },
  {
    id: "actions",
    label: { fr: "Actions", en: "Actions" },
    principle: { fr: "Récupération avant geste", en: "Retrieval before action" },
    summary: {
      fr: "Rappeler juste avant le geste, puis confirmer le résultat sans détour.",
      en: "Recall just before the action, then confirm the result without friction.",
    },
  },
  {
    id: "reports",
    label: { fr: "Rapports", en: "Reports" },
    principle: { fr: "Mémoire longue", en: "Long-term memory" },
    summary: {
      fr: "Rendre la prochaine révision visible et facile à reprendre plus tard.",
      en: "Make the next review visible and easy to resume later.",
    },
  },
  {
    id: "network",
    label: { fr: "Réseau", en: "Network" },
    principle: { fr: "Interleaving social", en: "Social interleaving" },
    summary: {
      fr: "Montrer les liens entre acteurs, formats et thèmes pour ouvrir de nouveaux chemins.",
      en: "Surface links between actors, formats, and themes to open new paths.",
    },
  },
];

export const COGNITIVE_MICRO_RECALLS: CognitiveMicroRecallSpec[] = [
  {
    id: "feedback",
    label: { fr: "Feedback immédiat", en: "Immediate feedback" },
    summary: {
      fr: "Afficher la bonne réponse ou le bon geste juste après l'action.",
      en: "Show the right answer or action immediately after interaction.",
    },
  },
  {
    id: "review",
    label: { fr: "Rappel à revoir", en: "Review reminder" },
    summary: {
      fr: "Marquer discrètement ce qui doit revenir au bon moment.",
      en: "Discreetly mark what should return at the right time.",
    },
  },
  {
    id: "tomorrow",
    label: { fr: "Reprendre demain", en: "Resume tomorrow" },
    summary: {
      fr: "Préparer une reprise courte à la prochaine visite, sans notification intrusive.",
      en: "Prepare a short follow-up on the next visit, without intrusive notifications.",
    },
  },
];

export function getCognitiveRubricById(id: CognitiveRubricId): CognitiveRubricSpec {
  const rubric = COGNITIVE_RUBRICS.find((item) => item.id === id);
  if (!rubric) {
    return COGNITIVE_RUBRICS[0];
  }
  return rubric;
}

export function getQuizStateLabel(
  stateId: CognitiveQuizStateId,
  locale: SupportedLocale,
): string {
  return COGNITIVE_QUIZ_STATE_LABELS[locale][stateId];
}

export function getQuizStateFromStats(
  stats: SRSStats | undefined,
  now: Date = new Date(),
): CognitiveQuizStateId {
  if (!stats) {
    return "new";
  }

  if (stats.success_count === 0 && stats.failure_count === 0) {
    return "new";
  }

  const nextReviewTime = new Date(stats.next_review_at).getTime();
  const nowTime = now.getTime();

  if (stats.failure_count > 0 && stats.streak === 0 && nextReviewTime > nowTime) {
    return "failed";
  }

  if (nextReviewTime <= nowTime) {
    return "due";
  }

  return "mastered";
}

export function summarizeQuizStates(
  statsByQuestionId: Record<string, SRSStats>,
  questionIds: string[],
  now: Date = new Date(),
): CognitiveQuizSummary {
  const counts: Record<CognitiveQuizStateId, number> = {
    new: 0,
    failed: 0,
    due: 0,
    mastered: 0,
  };
  let nextReviewAt: string | null = null;

  questionIds.forEach((questionId) => {
    const stats = statsByQuestionId[questionId];
    const state = getQuizStateFromStats(stats, now);
    counts[state] += 1;

    if (stats) {
      if (!nextReviewAt || new Date(stats.next_review_at).getTime() < new Date(nextReviewAt).getTime()) {
        nextReviewAt = stats.next_review_at;
      }
    }
  });

  return {
    counts,
    total: questionIds.length,
    nextReviewAt,
  };
}

const QUIZ_STATE_PRIORITY: Record<CognitiveQuizStateId, number> = {
  failed: 0,
  due: 1,
  new: 2,
  mastered: 3,
};

function getSRSReviewTime(
  stats: SRSStats | undefined,
  now: Date,
): number {
  if (!stats) {
    return now.getTime();
  }

  return new Date(stats.next_review_at).getTime();
}

function interleaveByCategory<T extends CognitiveQuizQuestionLike>(
  questions: T[],
  statsByQuestionId: Record<string, SRSStats>,
  now: Date,
): T[] {
  if (questions.length <= 1) {
    return questions;
  }

  const categoryBuckets = new Map<string, T[]>();
  questions.forEach((question) => {
    const bucket = categoryBuckets.get(question.category) ?? [];
    bucket.push(question);
    categoryBuckets.set(question.category, bucket);
  });

  const categoryOrder = Array.from(categoryBuckets.entries()).sort(
    ([, leftBucket], [, rightBucket]) => {
      const leftReviewTime = getSRSReviewTime(
        statsByQuestionId[leftBucket[0]?.id ?? ""],
        now,
      );
      const rightReviewTime = getSRSReviewTime(
        statsByQuestionId[rightBucket[0]?.id ?? ""],
        now,
      );

      if (leftReviewTime !== rightReviewTime) {
        return leftReviewTime - rightReviewTime;
      }

      const leftCategory = leftBucket[0]?.category ?? "";
      const rightCategory = rightBucket[0]?.category ?? "";
      return leftCategory.localeCompare(rightCategory, "fr");
    },
  );

  const ordered: T[] = [];
  let hasRemaining = true;
  while (hasRemaining) {
    hasRemaining = false;
    for (const [, bucket] of categoryOrder) {
      const nextQuestion = bucket.shift();
      if (nextQuestion) {
        ordered.push(nextQuestion);
        hasRemaining = true;
      }
    }
  }

  return ordered;
}

export function buildMixedQuizOrder<T extends CognitiveQuizQuestionLike>(
  questions: readonly T[],
  statsByQuestionId: Record<string, SRSStats>,
  now: Date = new Date(),
): T[] {
  if (questions.length <= 1) {
    return [...questions];
  }

  const stateBuckets = new Map<CognitiveQuizStateId, T[]>();
  questions.forEach((question) => {
    const stats = statsByQuestionId[question.id];
    const state = getQuizStateFromStats(stats, now);
    const bucket = stateBuckets.get(state) ?? [];
    bucket.push(question);
    stateBuckets.set(state, bucket);
  });

  const ordered: T[] = [];
  (Object.keys(QUIZ_STATE_PRIORITY) as CognitiveQuizStateId[])
    .sort((left, right) => QUIZ_STATE_PRIORITY[left] - QUIZ_STATE_PRIORITY[right])
    .forEach((state) => {
      const bucket = stateBuckets.get(state);
      if (!bucket || bucket.length === 0) {
        return;
      }
      ordered.push(...interleaveByCategory([...bucket], statsByQuestionId, now));
    });

  return ordered;
}

export function formatCognitiveDate(
  value: string | null,
  locale: SupportedLocale,
): string {
  if (!value) {
    return locale === "fr" ? "Aucune révision planifiée" : "No review scheduled";
  }

  const date = new Date(value);
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
