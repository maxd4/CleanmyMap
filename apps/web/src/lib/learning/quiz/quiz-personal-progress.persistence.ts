import { createLocalStorageStore } from "@/lib/storage/local-storage";
import type { QuizPersonalProgressState } from "./quiz-personal-progress.contracts";
import { normalizeQuizPersonalProgressState } from "./quiz-personal-progress.normalization";

const QUIZ_PERSONAL_PROGRESS_STORAGE_KEY = "cleanmymap.quiz.personal-progress";

const quizPersonalProgressStorage = createLocalStorageStore<QuizPersonalProgressState>(
  QUIZ_PERSONAL_PROGRESS_STORAGE_KEY,
  {
    parse: (raw) => {
      try {
        return normalizeQuizPersonalProgressState(JSON.parse(raw) as unknown);
      } catch {
        return null;
      }
    },
    serialize: (value) => JSON.stringify(value),
  },
);

export function readQuizPersonalProgress(): QuizPersonalProgressState | null {
  return quizPersonalProgressStorage.read();
}

export function saveQuizPersonalProgress(progress: QuizPersonalProgressState): boolean {
  return quizPersonalProgressStorage.write(progress);
}
