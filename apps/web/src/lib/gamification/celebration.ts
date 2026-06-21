export const GAMIFICATION_CELEBRATION_EVENT = "cmm-gamification-celebration";

export type GamificationCelebrationTone =
  | "explorer"
  | "forms"
  | "clean-zones"
  | "actions"
  | "generic";

export type GamificationCelebrationPayload = {
  title: string;
  message: string;
  tone?: GamificationCelebrationTone;
  icon?: string;
  durationMs?: number;
  confetti?: boolean;
  sound?: boolean;
  source?: string;
  dedupeKey?: string;
};

export function dispatchGamificationCelebration(
  payload: GamificationCelebrationPayload,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<GamificationCelebrationPayload>(
      GAMIFICATION_CELEBRATION_EVENT,
      { detail: payload },
    ),
  );
}
