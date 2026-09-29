export type LightCelebrationPreview = {
  title: string;
  message: string;
  tone: "generic";
  icon: string;
  durationMs: number;
  confetti: boolean;
  sound: boolean;
  source: string;
};

export function buildLightCelebrationPreview(locale: string): LightCelebrationPreview {
  const fr = locale === "fr";
  return {
    title: fr ? "Palier atteint" : "Threshold reached",
    message: fr
      ? "Aperçu discret d’une célébration légère: toast, son bref et confetti léger."
      : "A discreet preview of a light celebration: toast, short sound and light confetti.",
    tone: "generic",
    icon: "✨",
    durationMs: 2800,
    confetti: true,
    sound: true,
    source: "light-celebrations-panel",
  };
}
