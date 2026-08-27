export type QuizSourceType =
  | "institutionnelle"
  | "scientifique"
  | "associative"
  | "presse"
  | "interne"
  | "estimation";

export type QuizConfidenceLevel = "élevé" | "moyen" | "faible";

export type QuizLocalScope = "national" | "regional" | "departemental" | "communal" | "variable";

export type QuizSourceMetadata = {
  sourceUrl: string;
  sourceLabel: string;
  sourceType: QuizSourceType;
  confidenceLevel: QuizConfidenceLevel;
  isLocalRule: boolean;
  localScope: QuizLocalScope;
  lastCheckedAt: string;
  needsReview: boolean;
};
