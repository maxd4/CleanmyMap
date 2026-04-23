import type { ActionVisionEstimate } from "@/lib/actions/types";

export type SuspicionState = {
  isSuspect: boolean;
  message: string | null;
};

function parsePositiveNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatDensity(value: ActionVisionEstimate["density"]["value"]): string {
  if (value === "humide_dense") {
    return "humide / dense";
  }
  return value === "mouille" ? "mouillé" : "sec";
}

function buildMessage(kind: string, suggested: string): string {
  return `Écart suspect : ${kind} conseillé ${suggested}.`;
}

function isOutsideInterval(
  actual: number,
  interval: [number, number] | null | undefined,
  toleranceRatio = 0.25,
): boolean {
  if (!interval) {
    return false;
  }
  const [min, max] = interval;
  const span = Math.max(1, max - min);
  const tolerance = span * toleranceRatio;
  return actual < min - tolerance || actual > max + tolerance;
}

export function getWasteWeightSuspicion(
  currentWasteKg: string,
  estimate: ActionVisionEstimate | null,
): SuspicionState {
  const actual = parsePositiveNumber(currentWasteKg);
  if (actual === null || !estimate) {
    return { isSuspect: false, message: null };
  }

  const suggested = estimate.wasteKg.value;
  const diff = Math.abs(actual - suggested);
  const relativeDelta = diff / Math.max(1, suggested);
  const suspicious =
    isOutsideInterval(actual, estimate.wasteKg.interval, estimate.provisional ? 0.15 : 0.25) ||
    relativeDelta >= (estimate.provisional ? 0.45 : 0.55);

  return suspicious
    ? {
        isSuspect: true,
        message: buildMessage("la masse", `${suggested.toFixed(1)} kg`),
      }
    : { isSuspect: false, message: null };
}

export function getBagCountSuspicion(
  currentBagCount: string,
  estimate: ActionVisionEstimate | null,
): SuspicionState {
  const actual = parsePositiveNumber(currentBagCount);
  if (actual === null || !estimate) {
    return { isSuspect: false, message: null };
  }

  const suggested = estimate.bagsCount.value;
  const diff = Math.abs(actual - suggested);
  const suspicious =
    diff >= 2 ||
    isOutsideInterval(actual, estimate.bagsCount.interval, estimate.provisional ? 0.2 : 0.3);

  return suspicious
    ? {
        isSuspect: true,
        message: buildMessage("le nombre de sacs", `${suggested} sac(s)`),
      }
    : { isSuspect: false, message: null };
}

export function getFillLevelSuspicion(
  currentFillLevel: string,
  estimate: ActionVisionEstimate | null,
): SuspicionState {
  const actual = parsePositiveNumber(currentFillLevel);
  if (actual === null || !estimate) {
    return { isSuspect: false, message: null };
  }

  const suggested = estimate.fillLevel.value;
  const stepIndex = new Map<number, number>([
    [25, 0],
    [50, 1],
    [75, 2],
    [100, 3],
  ]);
  const actualStep = stepIndex.get(Math.round(actual));
  const suggestedStep = stepIndex.get(Math.round(suggested));
  if (actualStep === undefined || suggestedStep === undefined) {
    return { isSuspect: false, message: null };
  }

  const suspicious = Math.abs(actualStep - suggestedStep) >= 2;
  return suspicious
    ? {
        isSuspect: true,
        message: buildMessage("le remplissage", `${suggested}%`),
      }
    : { isSuspect: false, message: null };
}

export function getDensitySuspicion(
  currentDensity: string,
  estimate: ActionVisionEstimate | null,
): SuspicionState {
  if (!currentDensity || !estimate) {
    return { isSuspect: false, message: null };
  }

  const suggested = estimate.density.value;
  const suspicious = currentDensity !== suggested;
  return suspicious
    ? {
        isSuspect: true,
        message: buildMessage("la densité", formatDensity(suggested)),
      }
    : { isSuspect: false, message: null };
}
