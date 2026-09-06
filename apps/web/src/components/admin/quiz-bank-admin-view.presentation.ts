import { QUIZ_TRAP_LEVELS } from "@/lib/learning/quiz/quiz-trap-levels";
import type { QuizDifficultyId } from "@/lib/learning/quiz/quiz-taxonomy";
import type { QuizSourceType } from "@/lib/learning/quiz/quiz-source-metadata";
import type {
  QuizBankAdminQuestion,
  QuizBankSourceState,
} from "@/lib/learning/quiz/quiz-bank-admin";

export const SOURCE_TYPE_LABELS: Record<QuizSourceType, string> = {
  institutionnelle: "Institutionnelle",
  scientifique: "Scientifique",
  associative: "Associative",
  presse: "Presse",
  interne: "Interne",
  estimation: "Estimation",
};

export const SOURCE_STATE_LABELS: Record<QuizBankSourceState, string> = {
  missing: "Sans source",
  weak: "Source faible",
  sourced: "Source documentée",
};

export const SOURCE_STATE_TONES: Record<QuizBankSourceState, "rose" | "amber" | "emerald"> = {
  missing: "rose",
  weak: "amber",
  sourced: "emerald",
};

export function getDifficultyLabel(difficulty: QuizDifficultyId): string {
  return difficulty === "low" ? "Faible" : difficulty === "medium" ? "Moyen" : "Élevé";
}

export function getTrapLevelLabel(trapLevel: string): string {
  return QUIZ_TRAP_LEVELS.find((item) => item.id === trapLevel)?.label ?? trapLevel;
}

export function getShortText(question: string, maxLength: number): string {
  if (question.length <= maxLength) {
    return question;
  }

  return `${question.slice(0, maxLength - 1).trimEnd()}…`;
}

export function getQuestionTone(question: QuizBankAdminQuestion): "rose" | "amber" | "emerald" | "sky" {
  if (question.sourceState === "missing") {
    return "rose";
  }

  if (question.sourceState === "weak" || question.priorityScore >= 80) {
    return "amber";
  }

  return "sky";
}
