import type { ActionMegotsCondition } from "@/lib/actions/types";
import {
  MAX_CIGARETTE_BUTTS_COUNT,
  normalizeCigaretteButtsMeasurementsFromUserInput,
} from "@/lib/waste/cigarette-butts";
import { deriveWasteComparison, type WasteComparisonTone } from "../utils/harvest-utils";
import { useCallback, useMemo } from "react";
import { useActionPollutionScoreReferences } from "../../map/scores/action-pollution-score-references-context";
import { ACTION_MEASUREMENT_MAX_KG } from "@/lib/waste";

import type { FormState } from "../model";

type UseHarvestLogicParams = {
  form: FormState;
  updateFields: (updates: Partial<FormState>) => void;
};

function readValidComparisonNumber(rawValue: string, min: number, max: number): number | null {
  if (rawValue.trim() === "") {
    return null;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function readValidCount(rawValue: string): number | null {
  if (rawValue.trim() === "") {
    return null;
  }
  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_CIGARETTE_BUTTS_COUNT
    ? parsed
    : null;
}

function readValidMass(rawValue: string): number | null {
  if (rawValue.trim() === "") {
    return null;
  }
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= ACTION_MEASUREMENT_MAX_KG ? parsed : null;
}

function formatDerivedNumber(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "";
  }
  return Number(value.toFixed(6)).toString();
}

export type UseHarvestLogicResult = {
  wasteCurrentPerVolunteer: number | null;
  wasteBenchmarkPerVolunteer: number | null;
  wasteBenchmarkSourceCount: number;
  wasteDeltaPercent: number | null;
  comparisonTone: WasteComparisonTone;
  megotsKg: number | null;
  megotsCount: number | null;
  megotsCurrentPerVolunteer: number | null;
  megotsBenchmarkPerVolunteer: number | null;
  megotsBenchmarkSourceCount: number;
  megotsDeltaPercent: number | null;
  megotsComparisonTone: WasteComparisonTone;
  cigaretteButtsCountProvenance: string;
  cigaretteButtsMassProvenance: string;
  cigaretteButtsConversionFormulaVersion: string | null;
  syncMegotsWeightFromWeight: (rawValue: string) => void;
  syncMegotsWeightFromCount: (rawValue: string) => void;
  syncMegotsCondition: (rawValue: ActionMegotsCondition) => void;
};

export function useHarvestLogic({
  form,
  updateFields,
}: UseHarvestLogicParams): UseHarvestLogicResult {
  const { collectionReferences } = useActionPollutionScoreReferences();

  const derived = useMemo(() => {
    const wasteKg = readValidComparisonNumber(form.wasteKg, 0, ACTION_MEASUREMENT_MAX_KG);
    const volunteersCount = readValidComparisonNumber(form.volunteersCount, 1, 1000);
    const wasteComparison = deriveWasteComparison({
      wasteKg,
      volunteersCount,
      benchmarkPerVolunteer: collectionReferences?.wastePerVolunteer ?? null,
      benchmarkSourceCount: collectionReferences?.wasteSourceCount ?? 0,
    });
    const cigaretteButtsMeasurements = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: readValidCount(form.cigaretteButtsCount),
      cigaretteButtsMassKg: readValidMass(form.wasteMegotsKg),
      cigaretteButtsCondition: form.wasteMegotsCondition,
      cigaretteButtsInputSource: form.cigaretteButtsInputSource,
    });
    const megotsComparison = deriveWasteComparison({
      wasteKg: cigaretteButtsMeasurements.cigaretteButtsCount,
      volunteersCount,
      benchmarkPerVolunteer: collectionReferences?.buttsPerVolunteer ?? null,
      benchmarkSourceCount: collectionReferences?.buttsSourceCount ?? 0,
    });

    return {
      wasteCurrentPerVolunteer: wasteComparison.currentPerVolunteer,
      wasteBenchmarkPerVolunteer: wasteComparison.benchmarkPerVolunteer,
      wasteBenchmarkSourceCount: collectionReferences?.wasteSourceCount ?? 0,
      wasteDeltaPercent: wasteComparison.deltaPercent,
      comparisonTone: wasteComparison.tone,
      megotsKg: cigaretteButtsMeasurements.cigaretteButtsMassKg,
      megotsCount: cigaretteButtsMeasurements.cigaretteButtsCount,
      megotsCurrentPerVolunteer: megotsComparison.currentPerVolunteer,
      megotsBenchmarkPerVolunteer: megotsComparison.benchmarkPerVolunteer,
      megotsBenchmarkSourceCount: collectionReferences?.buttsSourceCount ?? 0,
      megotsDeltaPercent: megotsComparison.deltaPercent,
      megotsComparisonTone: megotsComparison.tone,
      cigaretteButtsCountProvenance:
        cigaretteButtsMeasurements.cigaretteButtsCountProvenance,
      cigaretteButtsMassProvenance:
        cigaretteButtsMeasurements.cigaretteButtsMassProvenance,
      cigaretteButtsConversionFormulaVersion:
        cigaretteButtsMeasurements.cigaretteButtsConversionFormulaVersion,
    };
  }, [
    form.cigaretteButtsCount,
    form.volunteersCount,
    form.wasteMegotsCondition,
    form.wasteMegotsKg,
    form.wasteKg,
    form.cigaretteButtsInputSource,
    collectionReferences,
  ]);

  const syncMegotsWeightFromWeight = useCallback(
    (rawValue: string) => {
      const mass = rawValue.trim() === "" ? null : readValidMass(rawValue);
      const normalized = mass === null
        ? null
        : normalizeCigaretteButtsMeasurementsFromUserInput({
            cigaretteButtsMassKg: mass,
            cigaretteButtsCondition: form.wasteMegotsCondition,
            cigaretteButtsInputSource: "mass",
          });
      updateFields({
        wasteMegotsKg: rawValue,
        cigaretteButtsInputSource: rawValue.trim() === "" ? null : "mass",
        cigaretteButtsCount: normalized?.cigaretteButtsCount === null || normalized === null
          ? ""
          : String(normalized.cigaretteButtsCount),
      });
    },
    [form.wasteMegotsCondition, updateFields],
  );

  const syncMegotsWeightFromCount = useCallback(
    (rawValue: string) => {
      const count = rawValue.trim() === "" ? null : readValidCount(rawValue);
      const normalized = count === null
        ? null
        : normalizeCigaretteButtsMeasurementsFromUserInput({
            cigaretteButtsCount: count,
            cigaretteButtsCondition: form.wasteMegotsCondition,
            cigaretteButtsInputSource: "count",
          });
      updateFields({
        cigaretteButtsCount: rawValue,
        cigaretteButtsInputSource: rawValue.trim() === "" ? null : "count",
        wasteMegotsKg: normalized?.cigaretteButtsMassKg === null || normalized === null
          ? ""
          : formatDerivedNumber(normalized.cigaretteButtsMassKg),
      });
    },
    [form.wasteMegotsCondition, updateFields],
  );

  const syncMegotsCondition = useCallback(
    (rawValue: ActionMegotsCondition) => {
      const source = form.cigaretteButtsInputSource;
      const count = source === "count" ? readValidCount(form.cigaretteButtsCount) : null;
      const mass = source === "mass" ? readValidMass(form.wasteMegotsKg) : null;
      const normalized = source === "count" && count !== null
        ? normalizeCigaretteButtsMeasurementsFromUserInput({
            cigaretteButtsCount: count,
            cigaretteButtsCondition: rawValue,
            cigaretteButtsInputSource: "count",
          })
        : source === "mass" && mass !== null
          ? normalizeCigaretteButtsMeasurementsFromUserInput({
              cigaretteButtsMassKg: mass,
              cigaretteButtsCondition: rawValue,
              cigaretteButtsInputSource: "mass",
            })
          : null;

      updateFields({
        wasteMegotsCondition: rawValue,
        cigaretteButtsCondition: rawValue,
        ...(source === "count"
          ? { wasteMegotsKg: normalized ? formatDerivedNumber(normalized.cigaretteButtsMassKg ?? 0) : "" }
          : source === "mass"
            ? { cigaretteButtsCount: normalized?.cigaretteButtsCount === null || normalized === null ? "" : String(normalized.cigaretteButtsCount) }
            : {}),
      });
    },
    [form.cigaretteButtsCount, form.cigaretteButtsInputSource, form.wasteMegotsKg, updateFields],
  );

  return {
    ...derived,
    syncMegotsWeightFromWeight,
    syncMegotsWeightFromCount,
    syncMegotsCondition,
  };
}
