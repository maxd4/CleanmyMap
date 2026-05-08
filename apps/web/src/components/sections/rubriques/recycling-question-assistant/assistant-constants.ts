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
