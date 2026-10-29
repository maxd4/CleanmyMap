import type { ActionMegotsCondition } from "@/lib/actions/types";
import {
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
  MAX_CIGARETTE_BUTTS_COUNT,
  normalizeCigaretteButtsMeasurements,
} from "@/lib/waste/cigarette-butts";
import { deriveWasteComparison, type WasteComparisonTone } from "../utils/harvest-utils";
import { useCallback, useMemo, useState } from "react";
import { useActionPollutionScoreReferences } from "../../map/scores/action-pollution-score-references-context";
import { ACTION_MEASUREMENT_MAX_KG } from "@/lib/waste";

import type { FormState } from "../model";

type UseHarvestLogicParams = {
  form: FormState;
  updateFields: (updates: Partial<FormState>) => void;
};

type MegotsInputSource = "count" | "mass" | null;

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
  wasteDeltaPercent: number | null;
  comparisonTone: WasteComparisonTone;
  megotsKg: number | null;
  megotsCount: number | null;
  megotsCurrentPerVolunteer: number | null;
  megotsBenchmarkPerVolunteer: number | null;
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
  const { references } = useActionPollutionScoreReferences();
  const [lastMegotsInputSource, setLastMegotsInputSource] = useState<MegotsInputSource>(null);

  const derived = useMemo(() => {
    const wasteKg = readValidComparisonNumber(form.wasteKg, 0, ACTION_MEASUREMENT_MAX_KG);
    const volunteersCount = readValidComparisonNumber(form.volunteersCount, 1, 1000);
    const wasteComparison = deriveWasteComparison({
      wasteKg,
      volunteersCount,
      benchmarkPerVolunteer: references?.global.wastePerVolunteer ?? null,
      benchmarkSourceCount: references?.global.wasteSourceCount ?? 0,
    });
    const cigaretteButtsMeasurements = normalizeCigaretteButtsMeasurements({
      cigaretteButtsCount: readValidCount(form.cigaretteButtsCount),
      cigaretteButtsMassKg: readValidMass(form.wasteMegotsKg),
      cigaretteButtsCondition: form.wasteMegotsCondition,
      cigaretteButtsCountProvenance:
        lastMegotsInputSource === "mass" ? "weight_converted" : undefined,
      cigaretteButtsMassProvenance:
        lastMegotsInputSource === "count" ? "weight_converted" : undefined,
      cigaretteButtsConversionFormulaVersion:
        (lastMegotsInputSource === "count" && readValidCount(form.cigaretteButtsCount) !== null) ||
        (lastMegotsInputSource === "mass" && readValidMass(form.wasteMegotsKg) !== null)
          ? CIGARETTE_BUTTS_MASS_CONVERSION_VERSION
          : null,
      deriveMissingFromMassOrCount: true,
    });
    const megotsComparison = deriveWasteComparison({
      wasteKg: cigaretteButtsMeasurements.cigaretteButtsCount,
      volunteersCount,
      benchmarkPerVolunteer: references?.global.buttsPerVolunteer ?? null,
      benchmarkSourceCount: references?.global.buttsSourceCount ?? 0,
    });

    return {
      wasteCurrentPerVolunteer: wasteComparison.currentPerVolunteer,
      wasteBenchmarkPerVolunteer: wasteComparison.benchmarkPerVolunteer,
      wasteDeltaPercent: wasteComparison.deltaPercent,
      comparisonTone: wasteComparison.tone,
      megotsKg: cigaretteButtsMeasurements.cigaretteButtsMassKg,
      megotsCount: cigaretteButtsMeasurements.cigaretteButtsCount,
      megotsCurrentPerVolunteer: megotsComparison.currentPerVolunteer,
      megotsBenchmarkPerVolunteer: megotsComparison.benchmarkPerVolunteer,
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
    lastMegotsInputSource,
    references,
  ]);

  const syncMegotsWeightFromWeight = useCallback(
    (rawValue: string) => {
      setLastMegotsInputSource(rawValue.trim() === "" ? null : "mass");
      const mass = rawValue.trim() === "" ? null : readValidMass(rawValue);
      const normalized = mass === null
        ? null
        : normalizeCigaretteButtsMeasurements({
            cigaretteButtsMassKg: mass,
            cigaretteButtsCondition: form.wasteMegotsCondition,
            deriveMissingFromMassOrCount: true,
          });
      updateFields({
        wasteMegotsKg: rawValue,
        cigaretteButtsCount: normalized?.cigaretteButtsCount === null || normalized === null
          ? ""
          : String(normalized.cigaretteButtsCount),
      });
    },
    [form.wasteMegotsCondition, updateFields],
  );

  const syncMegotsWeightFromCount = useCallback(
    (rawValue: string) => {
      setLastMegotsInputSource(rawValue.trim() === "" ? null : "count");
      const count = rawValue.trim() === "" ? null : readValidCount(rawValue);
      const normalized = count === null
        ? null
        : normalizeCigaretteButtsMeasurements({
            cigaretteButtsCount: count,
            cigaretteButtsCondition: form.wasteMegotsCondition,
            deriveMissingFromMassOrCount: true,
          });
      updateFields({
        cigaretteButtsCount: rawValue,
        wasteMegotsKg: normalized?.cigaretteButtsMassKg === null || normalized === null
          ? ""
          : formatDerivedNumber(normalized.cigaretteButtsMassKg),
      });
    },
    [form.wasteMegotsCondition, updateFields],
  );

  const syncMegotsCondition = useCallback(
    (rawValue: ActionMegotsCondition) => {
      const source = lastMegotsInputSource ?? (
        form.cigaretteButtsCount.trim() !== ""
          ? "count"
          : form.wasteMegotsKg.trim() !== ""
            ? "mass"
            : null
      );
      const count = source === "count" ? readValidCount(form.cigaretteButtsCount) : null;
      const mass = source === "mass" ? readValidMass(form.wasteMegotsKg) : null;
      const normalized = source === "count" && count !== null
        ? normalizeCigaretteButtsMeasurements({
            cigaretteButtsCount: count,
            cigaretteButtsCondition: rawValue,
            deriveMissingFromMassOrCount: true,
          })
        : source === "mass" && mass !== null
          ? normalizeCigaretteButtsMeasurements({
              cigaretteButtsMassKg: mass,
              cigaretteButtsCondition: rawValue,
              deriveMissingFromMassOrCount: true,
            })
          : null;

      updateFields({
        wasteMegotsCondition: rawValue,
        ...(source === "count"
          ? { wasteMegotsKg: normalized ? formatDerivedNumber(normalized.cigaretteButtsMassKg ?? 0) : "" }
          : source === "mass"
            ? { cigaretteButtsCount: normalized?.cigaretteButtsCount === null || normalized === null ? "" : String(normalized.cigaretteButtsCount) }
            : {}),
      });
    },
    [form.cigaretteButtsCount, form.wasteMegotsKg, lastMegotsInputSource, updateFields],
  );

  return {
    ...derived,
    syncMegotsWeightFromWeight,
    syncMegotsWeightFromCount,
    syncMegotsCondition,
  };
}
