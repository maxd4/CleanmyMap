import type { ActionMegotsCondition } from "@/lib/actions/types";
import { normalizeCigaretteButtsMeasurements } from "@/lib/waste/cigarette-butts";
import { clamp } from "../utils/harvest-utils";
import { useCallback, useMemo } from "react";

import type { FormState } from "../form/model";
import type { UpdateFormField } from "../types";

type UseHarvestLogicParams = {
  form: FormState;
  updateField: UpdateFormField;
  heuristicEstimatedWasteKg: number;
  estimatedWasteKg: number;
  estimatedWasteKgConfidence: number | null;
  wasteSuggestionSource: "vision" | "heuristic";
};

type HarvestComparisonTone = "emerald" | "orange";

function toFiniteNumber(rawValue: string, fallback = 0): number {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoundedNumber(
  rawValue: string,
  min: number,
  max: number,
  fallback = min,
): number {
  return clamp(toFiniteNumber(rawValue, fallback), min, max);
}

function readOptionalNumber(rawValue: string, min: number, max: number): number | null {
  if (rawValue.trim() === "") {
    return null;
  }
  return readBoundedNumber(rawValue, min, max, min);
}

export type UseHarvestLogicResult = {
  volunteersCount: number;
  wasteKg: number;
  wasteKgClamped: number;
  wasteBenchmarkKg: number;
  wasteCurrentPerVolunteer: number;
  wasteBenchmarkPerVolunteer: number;
  wasteDeltaPercent: number;
  wasteMegotsKg: number;
  cigaretteButtsCount: number;
  megotsKg: number;
  megotsCount: number;
  megotsCurrentPerVolunteer: number;
  megotsDeltaPercent: number;
  cigaretteButtsCountProvenance: string;
  cigaretteButtsMassProvenance: string;
  cigaretteButtsConversionFormulaVersion: string | null;
  comparisonTone: HarvestComparisonTone;
  confidenceLabel: string | null;
  sourceLabel: string;
  syncMegotsWeightFromWeight: (rawValue: string) => void;
  syncMegotsWeightFromCount: (rawValue: string) => void;
  syncMegotsCondition: (rawValue: ActionMegotsCondition) => void;
};

export function useHarvestLogic({
  form,
  updateField,
  heuristicEstimatedWasteKg,
  estimatedWasteKg,
  estimatedWasteKgConfidence,
  wasteSuggestionSource,
}: UseHarvestLogicParams): UseHarvestLogicResult {
  const derived = useMemo(() => {
    const volunteersCount = Math.max(
      1,
      Math.trunc(readBoundedNumber(form.volunteersCount, 1, 1000, 1)) || 1,
    );
    const wasteKg = readBoundedNumber(form.wasteKg, 0, 100, 0);
    const wasteKgClamped = clamp(wasteKg, 0, 100);
    const rawWasteBenchmarkKg =
      heuristicEstimatedWasteKg > 0 ? heuristicEstimatedWasteKg : estimatedWasteKg;
    const wasteBenchmarkKg = clamp(
      Number.isFinite(rawWasteBenchmarkKg) ? rawWasteBenchmarkKg : 0,
      0,
      1000,
    );
    const wasteCurrentPerVolunteer = wasteKg / volunteersCount;
    const wasteBenchmarkPerVolunteer = wasteBenchmarkKg / volunteersCount;
    const wasteDeltaPercent =
      wasteBenchmarkPerVolunteer > 0
        ? ((wasteCurrentPerVolunteer - wasteBenchmarkPerVolunteer) /
            wasteBenchmarkPerVolunteer) *
          100
        : 0;

    const cigaretteButtsMeasurements = normalizeCigaretteButtsMeasurements({
      cigaretteButtsCount: readOptionalNumber(form.cigaretteButtsCount, 0, 10000),
      cigaretteButtsMassKg: readOptionalNumber(form.wasteMegotsKg, 0, 100),
      cigaretteButtsCondition: form.wasteMegotsCondition,
      deriveMissingFromMassOrCount: true,
    });
    const wasteMegotsKg = cigaretteButtsMeasurements.cigaretteButtsMassKg ?? 0;
    const cigaretteButtsCount = cigaretteButtsMeasurements.cigaretteButtsCount ?? 0;
    const megotsKg = wasteMegotsKg;
    const megotsCount = cigaretteButtsCount;
    const megotsCurrentPerVolunteer = megotsKg / volunteersCount;
    const megotsDeltaPercent =
      wasteBenchmarkPerVolunteer > 0
        ? ((megotsCurrentPerVolunteer - wasteBenchmarkPerVolunteer) /
            wasteBenchmarkPerVolunteer) *
          100
        : 0;
    const comparisonTone: HarvestComparisonTone =
      megotsDeltaPercent >= 0 ? "orange" : "emerald";

    const confidenceLabel =
      estimatedWasteKgConfidence != null
        ? `${Math.round(estimatedWasteKgConfidence * 100)}%`
        : null;
    const sourceLabel =
      wasteSuggestionSource === "vision" ? "repère vision" : "repère heuristique";

    return {
      volunteersCount,
      wasteKg,
      wasteKgClamped,
      wasteBenchmarkKg,
      wasteCurrentPerVolunteer,
      wasteBenchmarkPerVolunteer,
      wasteDeltaPercent,
      wasteMegotsKg,
      cigaretteButtsCount,
      megotsKg,
      megotsCount,
      megotsCurrentPerVolunteer,
      megotsDeltaPercent,
      cigaretteButtsCountProvenance:
        cigaretteButtsMeasurements.cigaretteButtsCountProvenance,
      cigaretteButtsMassProvenance:
        cigaretteButtsMeasurements.cigaretteButtsMassProvenance,
      cigaretteButtsConversionFormulaVersion:
        cigaretteButtsMeasurements.cigaretteButtsConversionFormulaVersion,
      comparisonTone,
      confidenceLabel,
      sourceLabel,
    };
  }, [
    estimatedWasteKg,
    estimatedWasteKgConfidence,
    form.cigaretteButtsCount,
    form.volunteersCount,
    form.wasteKg,
    form.wasteMegotsCondition,
    form.wasteMegotsKg,
    heuristicEstimatedWasteKg,
    wasteSuggestionSource,
  ]);

  const syncMegotsWeightFromWeight = useCallback(
    (rawValue: string) => {
      updateField("wasteMegotsKg", rawValue);
    },
    [updateField],
  );

  const syncMegotsWeightFromCount = useCallback(
    (rawValue: string) => {
      updateField("cigaretteButtsCount", rawValue);
    },
    [updateField],
  );

  const syncMegotsCondition = useCallback(
    (rawValue: ActionMegotsCondition) => {
      updateField("wasteMegotsCondition", rawValue);
    },
    [updateField],
  );

  return {
    ...derived,
    syncMegotsWeightFromWeight,
    syncMegotsWeightFromCount,
    syncMegotsCondition,
  };
}
