export type Locale = "fr" | "en";
export type Tone = "emerald" | "amber" | "rose" | "slate";
export type AnswerKind = "packaging" | "glass" | "decheterie" | "specific" | "report" | "unknown";

export type Answer = {
  kind: AnswerKind;
  tone: Tone;
  badge: string;
  title: string;
  summary: string;
  bullets: string[];
  nextStep: string;
  note?: string;
};

export type AssistantCopy = {
  title: string;
  subtitle: string;
  placeholder: string;
  helper: string;
  examples: string;
  clear: string;
  answerTitle: string;
  answerNext: string;
  noteTitle: string;
  cta: string;
  yourQuestion: string;
  hint: string;
  footerNote: string;
};

export const QUICK_PROMPTS: Record<Locale, string[]> = {
  fr: [
    "ampoule usagée",
    "cartouche d'encre vide",
    "chaussures usées",
    "mégot",
    "carton gras de pizza",
    "déchets alimentaires / compost",
  ],
  en: [
    "used light bulb",
    "empty ink cartridge",
    "worn-out shoes",
    "cigarette butt",
    "greasy pizza box",
    "food scraps / compost",
  ],
};
