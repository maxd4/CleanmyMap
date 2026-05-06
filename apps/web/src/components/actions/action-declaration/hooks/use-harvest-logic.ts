import type { ActionMegotsCondition } from "@/lib/actions/types";
import {
  computeButtsCount,
  estimateButtsWeightKg,
} from "@/lib/actions/impact-calculators";
import { clamp } from "../utils/harvest-utils";
import { useCallback, useMemo } from "react";

import type { FormState } from "../../action-declaration-form.model";
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

    const wasteMegotsKg = readBoundedNumber(form.wasteMegotsKg, 0, 100, 0);
    const cigaretteButtsCount = Math.max(
      0,
      Math.trunc(readBoundedNumber(form.cigaretteButtsCount, 0, 10000, 0)),
    );
    const megotsKg =
      wasteMegotsKg > 0
        ? wasteMegotsKg
        : cigaretteButtsCount > 0
          ? estimateButtsWeightKg(cigaretteButtsCount, form.wasteMegotsCondition)
          : 0;
    const megotsCount =
      cigaretteButtsCount > 0
        ? cigaretteButtsCount
        : wasteMegotsKg > 0
          ? computeButtsCount(wasteMegotsKg, form.wasteMegotsCondition)
          : 0;
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

      const numericWeight = readBoundedNumber(rawValue, 0, 100, 0);
      if (numericWeight <= 0) {
        updateField("cigaretteButtsCount", "");
        return;
      }

      updateField(
        "cigaretteButtsCount",
        String(computeButtsCount(numericWeight, form.wasteMegotsCondition)),
      );
    },
    [form.wasteMegotsCondition, updateField],
  );

  const syncMegotsWeightFromCount = useCallback(
    (rawValue: string) => {
      updateField("cigaretteButtsCount", rawValue);

      const numericCount = readBoundedNumber(rawValue, 0, 10000, 0);
      if (numericCount <= 0) {
        updateField("wasteMegotsKg", "");
        return;
      }

      updateField(
        "wasteMegotsKg",
        estimateButtsWeightKg(numericCount, form.wasteMegotsCondition).toFixed(3),
      );
    },
    [form.wasteMegotsCondition, updateField],
  );

  const syncMegotsCondition = useCallback(
    (rawValue: ActionMegotsCondition) => {
      updateField("wasteMegotsCondition", rawValue);

      if (derived.wasteMegotsKg > 0) {
        updateField(
          "cigaretteButtsCount",
          String(computeButtsCount(derived.wasteMegotsKg, rawValue)),
        );
        return;
      }

      if (derived.cigaretteButtsCount > 0) {
        updateField(
          "wasteMegotsKg",
          estimateButtsWeightKg(derived.cigaretteButtsCount, rawValue).toFixed(3),
        );
      }
    },
    [derived.cigaretteButtsCount, derived.wasteMegotsKg, updateField],
  );

  return {
    ...derived,
    syncMegotsWeightFromWeight,
    syncMegotsWeightFromCount,
    syncMegotsCondition,
  };
}
