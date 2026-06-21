import { createLocalStorageStore } from "@/lib/storage/local-storage";

type QuizProgressByType = Record<
  string,
  {
    correctCount: number;
    updatedAt: string;
  }
>;

const QUIZ_PROGRESS_STORAGE_KEY = "cleanmymap.quiz.progress";

const quizProgressStorage = createLocalStorageStore<QuizProgressByType>(
  QUIZ_PROGRESS_STORAGE_KEY,
  {
    parse: (raw) => {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          return {};
        }

        const entries = Object.entries(parsed as Record<string, unknown>).reduce<QuizProgressByType>(
          (acc, [questionType, value]) => {
            if (
              typeof value !== "object" ||
              value === null ||
              Array.isArray(value)
            ) {
              return acc;
            }

            const correctCount = Number((value as { correctCount?: unknown }).correctCount);
            const updatedAt = (value as { updatedAt?: unknown }).updatedAt;

            acc[questionType] = {
              correctCount: Number.isFinite(correctCount) && correctCount > 0
                ? Math.trunc(correctCount)
                : 0,
              updatedAt: typeof updatedAt === "string" ? updatedAt : new Date().toISOString(),
            };
            return acc;
          },
          {},
        );

        return entries;
      } catch {
        return {};
      }
    },
    serialize: (value) => JSON.stringify(value),
  },
);

export function incrementQuizProgressLocal(questionType: string): void {
  const current = quizProgressStorage.read() ?? {};
  const nextCount = (current[questionType]?.correctCount ?? 0) + 1;

  quizProgressStorage.write({
    ...current,
    [questionType]: {
      correctCount: nextCount,
      updatedAt: new Date().toISOString(),
    },
  });
}
