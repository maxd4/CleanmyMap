export type QuizReasoningType =
  | "idée reçue"
  | "terrain"
  | "estimation"
  | "comparaison"
  | "conséquences indirectes"
  | "questions contre-intuitives"
  | "cas-limites";

export const REASONING_TYPE_ORDER: QuizReasoningType[] = [
  "idée reçue",
  "terrain",
  "estimation",
  "comparaison",
  "conséquences indirectes",
  "questions contre-intuitives",
  "cas-limites",
];

export function getNextReasoningType(
  reasoningType: QuizReasoningType | null,
): QuizReasoningType | null {
  if (!reasoningType) {
    return "idée reçue";
  }

  const index = REASONING_TYPE_ORDER.indexOf(reasoningType);
  return REASONING_TYPE_ORDER[index + 1] ?? null;
}
