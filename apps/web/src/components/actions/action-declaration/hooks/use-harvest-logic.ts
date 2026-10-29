import type { ActionMegotsCondition } from "@/lib/actions/types";
import {
  MAX_CIGARETTE_BUTTS_COUNT,
  normalizeCigaretteButtsMeasurements,
} from "@/lib/waste/cigarette-butts";
import { clamp } from "../utils/harvest-utils";
import { useCallback, useMemo } from "react";

import type { FormState } from "../model";
import type { UpdateFormField } from "../types";

type UseHarvestLogicParams = {
  form: FormState;
  updateField: UpdateFormField;
};

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
  megotsKg: number | null;
  megotsCount: number | null;
  cigaretteButtsCountProvenance: string;
  cigaretteButtsMassProvenance: string;
  cigaretteButtsConversionFormulaVersion: string | null;
  syncMegotsWeightFromWeight: (rawValue: string) => void;
  syncMegotsWeightFromCount: (rawValue: string) => void;
  syncMegotsCondition: (rawValue: ActionMegotsCondition) => void;
};

export function useHarvestLogic({
  form,
  updateField,
}: UseHarvestLogicParams): UseHarvestLogicResult {
  const derived = useMemo(() => {
    const cigaretteButtsMeasurements = normalizeCigaretteButtsMeasurements({
      cigaretteButtsCount: readOptionalNumber(form.cigaretteButtsCount, 0, MAX_CIGARETTE_BUTTS_COUNT),
      cigaretteButtsMassKg: readOptionalNumber(form.wasteMegotsKg, 0, 100),
      cigaretteButtsCondition: form.wasteMegotsCondition,
      deriveMissingFromMassOrCount: true,
    });

    return {
      megotsKg: cigaretteButtsMeasurements.cigaretteButtsMassKg,
      megotsCount: cigaretteButtsMeasurements.cigaretteButtsCount,
      cigaretteButtsCountProvenance:
        cigaretteButtsMeasurements.cigaretteButtsCountProvenance,
      cigaretteButtsMassProvenance:
        cigaretteButtsMeasurements.cigaretteButtsMassProvenance,
      cigaretteButtsConversionFormulaVersion:
        cigaretteButtsMeasurements.cigaretteButtsConversionFormulaVersion,
    };
  }, [
    form.cigaretteButtsCount,
    form.wasteMegotsCondition,
    form.wasteMegotsKg,
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
