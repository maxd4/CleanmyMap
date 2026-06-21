import type { QuizQuestionCategory } from "@/components/learn/quiz-review-targets";
import type { QuizReasoningType } from "@/components/learn/quiz-reasoning-types";

export type QuizTrapLevelId = "low" | "medium" | "high";

export type QuizTrapLevelDefinition = {
  id: QuizTrapLevelId;
  label: string;
  description: string;
};

export type QuizTrapLevelQuestion = {
  category: QuizQuestionCategory;
  reasoningType: QuizReasoningType;
  trapLevel?: QuizTrapLevelId;
};

export const QUIZ_TRAP_LEVELS: readonly QuizTrapLevelDefinition[] = [
  {
    id: "low",
    label: "Faible",
    description: "La question reste directe et le piège intuitif est limité.",
  },
  {
    id: "medium",
    label: "Moyen",
    description: "La question demande de réfléchir sans être fortement piégeuse.",
  },
  {
    id: "high",
    label: "Fort",
    description: "La question peut sembler facile mais elle est très piégeuse en intuition.",
  },
] as const;

const TRAP_LEVEL_BY_REASONING: Record<QuizReasoningType, QuizTrapLevelId> = {
  "idée reçue": "high",
  terrain: "medium",
  estimation: "low",
  comparaison: "medium",
  "conséquences indirectes": "medium",
  "questions contre-intuitives": "high",
  "cas-limites": "high",
  "mini-enquetes": "medium",
};

export function getQuizTrapLevel(question: QuizTrapLevelQuestion): QuizTrapLevelId {
  return question.trapLevel ?? TRAP_LEVEL_BY_REASONING[question.reasoningType];
}

export function matchesQuizTrapLevel(
  selectedTrapLevel: QuizTrapLevelId | null,
  question: QuizTrapLevelQuestion,
): boolean {
  if (!selectedTrapLevel) {
    return true;
  }

  return getQuizTrapLevel(question) === selectedTrapLevel;
}
