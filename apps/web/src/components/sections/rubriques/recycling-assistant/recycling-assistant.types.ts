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
