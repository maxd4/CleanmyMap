import type { ActionMegotsCondition } from "@/lib/actions/types";
import {
  MAX_CIGARETTE_BUTTS_COUNT,
  normalizeCigaretteButtsMeasurements,
  normalizeCigaretteButtsMeasurementsFromUserInput,
  type CigaretteButtsLotInput,
  type CigaretteButtsLotResult,
  type ActionCigaretteButtsMeasurements,
} from "@/lib/waste/cigarette-butts";
import {
  deriveWasteComparison,
  type HarvestReferenceStatus,
  type WasteComparisonTone,
} from "../utils/harvest-utils";
import { useCallback, useMemo } from "react";
import { useActionPollutionScoreReferences } from "../../map/scores/action-pollution-score-references-context";
import { ACTION_MEASUREMENT_MAX_KG } from "@/lib/waste";
import type { CigaretteButtsLotDraft, FormState } from "../model";

type UseHarvestLogicParams = {
  form: FormState;
  updateFields: (updates: Partial<FormState>) => void;
};

function resolveReferenceStatus(
  benchmark: number | null | undefined,
  sourceCount: number,
  isLoading: boolean,
): HarvestReferenceStatus {
  const hasRawReference = benchmark !== null && benchmark !== undefined &&
    Number.isFinite(benchmark) && benchmark >= 0;
  if (hasRawReference && sourceCount >= 2) return "available";
  if (hasRawReference) return "insufficient";
  return isLoading ? "loading" : "unavailable";
}

function readValidComparisonNumber(
  rawValue: string,
  min: number,
  max: number,
): number | null {
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
  return Number.isInteger(parsed) &&
    parsed >= 0 &&
    parsed <= MAX_CIGARETTE_BUTTS_COUNT
    ? parsed
    : null;
}

function readValidMass(rawValue: string): number | null {
  if (rawValue.trim() === "") {
    return null;
  }
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) &&
    parsed >= 0 &&
    parsed <= ACTION_MEASUREMENT_MAX_KG
    ? parsed
    : null;
}

function formatDerivedNumber(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "";
  }
  return Number(value.toFixed(6)).toString();
}

function buildExistingMeasurements(form: FormState): ActionCigaretteButtsMeasurements | null {
  const count = readValidCount(form.cigaretteButtsCount);
  const mass = readValidMass(form.wasteMegotsKg);
  const volume = readValidMass(form.cigaretteButtsVolumeLiters);
  const hasContext =
    count !== null ||
    mass !== null ||
    volume !== null ||
    form.cigaretteButtsInputSource !== null ||
    form.cigaretteButtsCountProvenance !== "unknown" ||
    form.cigaretteButtsMassProvenance !== "unknown" ||
    form.cigaretteButtsVolumeProvenance !== "unknown" ||
    form.cigaretteButtsConversionFormulaVersion !== null ||
    form.cigaretteButtsVolumeConversionFormulaVersion !== null;

  return hasContext
    ? {
        cigaretteButtsCount: count,
        cigaretteButtsMassKg: mass,
        cigaretteButtsVolumeLiters: volume,
        cigaretteButtsCondition: form.wasteMegotsCondition,
        cigaretteButtsCountProvenance: form.cigaretteButtsCountProvenance,
        cigaretteButtsMassProvenance: form.cigaretteButtsMassProvenance,
        cigaretteButtsVolumeProvenance: form.cigaretteButtsVolumeProvenance,
        cigaretteButtsConversionFormulaVersion:
          form.cigaretteButtsConversionFormulaVersion,
        cigaretteButtsVolumeConversionFormulaVersion:
          form.cigaretteButtsVolumeConversionFormulaVersion,
        cigaretteButtsInputSource: form.cigaretteButtsInputSource,
      }
    : null;
}

function buildMeasurementContextUpdates(
  measurements: ActionCigaretteButtsMeasurements,
): Partial<FormState> {
  return {
    cigaretteButtsCountProvenance: measurements.cigaretteButtsCountProvenance,
    cigaretteButtsMassProvenance: measurements.cigaretteButtsMassProvenance,
    cigaretteButtsVolumeProvenance: measurements.cigaretteButtsVolumeProvenance,
    cigaretteButtsConversionFormulaVersion:
      measurements.cigaretteButtsConversionFormulaVersion,
    cigaretteButtsVolumeConversionFormulaVersion:
      measurements.cigaretteButtsVolumeConversionFormulaVersion ?? null,
    ...(measurements.cigaretteButtsInputSource !== undefined
      ? { cigaretteButtsInputSource: measurements.cigaretteButtsInputSource }
      : {}),
  };
}

function parseDraftLot(draft: CigaretteButtsLotDraft): CigaretteButtsLotInput | null {
  if (!draft.id.trim() || draft.value.trim() === "") return null;
  const value = Number(draft.value);
  if (!Number.isFinite(value) || value < 0) return null;
  if (draft.source === "count" && !Number.isInteger(value)) return null;
  return { id: draft.id, source: draft.source, value, condition: draft.condition };
}

function buildLegacyLotDraft(form: FormState): CigaretteButtsLotDraft[] {
  if (form.cigaretteButtsInputSource === "count" && form.cigaretteButtsCount.trim()) {
    return [{ id: "legacy-count", source: "count", value: form.cigaretteButtsCount, condition: form.wasteMegotsCondition }];
  }
  if ((form.cigaretteButtsInputSource === "mass" || form.cigaretteButtsInputSource === "mass_kg") && form.wasteMegotsKg.trim()) {
    return [{ id: "legacy-mass", source: "mass_kg", value: form.wasteMegotsKg, condition: form.wasteMegotsCondition }];
  }
  if (form.cigaretteButtsInputSource === "volume_l" && form.cigaretteButtsVolumeLiters.trim()) {
    return [{ id: "legacy-volume", source: "volume_l", value: form.cigaretteButtsVolumeLiters, condition: form.wasteMegotsCondition }];
  }
  if (form.cigaretteButtsCount.trim() && !form.wasteMegotsKg.trim()) {
    return [{ id: "legacy-count", source: "count", value: form.cigaretteButtsCount, condition: form.wasteMegotsCondition }];
  }
  if (form.wasteMegotsKg.trim() && !form.cigaretteButtsCount.trim()) {
    return [{ id: "legacy-mass", source: "mass_kg", value: form.wasteMegotsKg, condition: form.wasteMegotsCondition }];
  }
  if (form.cigaretteButtsVolumeLiters.trim() && !form.cigaretteButtsCount.trim() && !form.wasteMegotsKg.trim()) {
    return [{ id: "legacy-volume", source: "volume_l", value: form.cigaretteButtsVolumeLiters, condition: form.wasteMegotsCondition }];
  }
  return [];
}

function buildLotMirrorUpdates(lots: CigaretteButtsLotDraft[]): Partial<FormState> {
  const inputs = lots.map(parseDraftLot).filter((lot): lot is CigaretteButtsLotInput => lot !== null);
  const normalized = normalizeCigaretteButtsMeasurementsFromUserInput({ cigaretteButtsLots: inputs });
  return {
    cigaretteButtsCount: normalized.cigaretteButtsCount === null ? "" : String(normalized.cigaretteButtsCount),
    wasteMegotsKg: normalized.cigaretteButtsMassKg === null ? "" : formatDerivedNumber(normalized.cigaretteButtsMassKg),
    cigaretteButtsVolumeLiters: normalized.cigaretteButtsVolumeLiters === null ? "" : formatDerivedNumber(normalized.cigaretteButtsVolumeLiters),
    cigaretteButtsInputSource: null,
    cigaretteButtsCondition: normalized.cigaretteButtsCondition ?? "propre",
    wasteMegotsCondition: normalized.cigaretteButtsCondition ?? "propre",
    ...buildMeasurementContextUpdates(normalized),
  };
}

export type UseHarvestLogicResult = {
  wasteCurrentPerVolunteer: number | null;
  wasteBenchmarkPerVolunteer: number | null;
  wasteBenchmarkSourceCount: number;
  wasteReferenceStatus: HarvestReferenceStatus;
  wasteDeltaPercent: number | null;
  comparisonTone: WasteComparisonTone;
  megotsKg: number | null;
  megotsCount: number | null;
  megotsCurrentPerVolunteer: number | null;
  megotsBenchmarkPerVolunteer: number | null;
  megotsBenchmarkSourceCount: number;
  megotsReferenceStatus: HarvestReferenceStatus;
  megotsDeltaPercent: number | null;
  megotsComparisonTone: WasteComparisonTone;
  cigaretteButtsCountProvenance: string;
  cigaretteButtsMassProvenance: string;
  cigaretteButtsVolumeProvenance: string;
  cigaretteButtsInputSource: string | null;
  cigaretteButtsConversionFormulaVersion: string | null;
  cigaretteButtsVolumeConversionFormulaVersion: string | null;
  megotsCounted: number;
  megotsEstimated: number;
  megotsMeasuredMassKg: number;
  megotsEstimatedMassKg: number;
  megotsLotResults: CigaretteButtsLotResult[];
  hasExplicitMegotsLots: boolean;
  addMegotsLot: () => void;
  updateMegotsLot: (id: string, patch: Partial<Omit<CigaretteButtsLotDraft, "id">>) => void;
  removeMegotsLot: (id: string) => void;
  moveMegotsLot: (id: string, direction: -1 | 1) => void;
  syncMegotsWeightFromWeight: (rawValue: string) => void;
  syncMegotsWeightFromCount: (rawValue: string) => void;
  syncMegotsVolume: (rawValue: string) => void;
  syncMegotsCondition: (rawValue: ActionMegotsCondition) => void;
};

type DerivedHarvestMetrics = Omit<
  UseHarvestLogicResult,
  | "syncMegotsWeightFromWeight"
  | "syncMegotsWeightFromCount"
  | "syncMegotsVolume"
  | "syncMegotsCondition"
   | "addMegotsLot"
   | "updateMegotsLot"
   | "removeMegotsLot"
   | "moveMegotsLot"
>;

function deriveHarvestMetrics(
  form: FormState,
  collectionReferences: ReturnType<
    typeof useActionPollutionScoreReferences
  >["collectionReferences"],
  referencesLoading: boolean,
): DerivedHarvestMetrics {
  const wasteKg = readValidComparisonNumber(form.wasteKg, 0, ACTION_MEASUREMENT_MAX_KG);
  const volunteersCount = readValidComparisonNumber(form.volunteersCount, 1, 500);
  const wasteComparison = deriveWasteComparison({
    wasteKg,
    volunteersCount,
    benchmarkPerVolunteer: collectionReferences?.wastePerVolunteer ?? null,
    benchmarkSourceCount: collectionReferences?.wasteSourceCount ?? 0,
  });
  const cigaretteButtsMeasurements =
    form.cigaretteButtsLots !== null
      ? normalizeCigaretteButtsMeasurementsFromUserInput({
          cigaretteButtsLots: form.cigaretteButtsLots
            .map(parseDraftLot)
            .filter((lot): lot is CigaretteButtsLotInput => lot !== null),
        })
      : form.cigaretteButtsInputSource === "unknown"
        ? normalizeCigaretteButtsMeasurements({
            cigaretteButtsCount: readValidCount(form.cigaretteButtsCount),
            cigaretteButtsMassKg: readValidMass(form.wasteMegotsKg),
            cigaretteButtsVolumeLiters: readValidMass(form.cigaretteButtsVolumeLiters),
            cigaretteButtsCondition: form.wasteMegotsCondition,
            cigaretteButtsCountProvenance: form.cigaretteButtsCountProvenance,
            cigaretteButtsMassProvenance: form.cigaretteButtsMassProvenance,
            cigaretteButtsVolumeProvenance: form.cigaretteButtsVolumeProvenance,
            cigaretteButtsConversionFormulaVersion: form.cigaretteButtsConversionFormulaVersion,
            cigaretteButtsVolumeConversionFormulaVersion:
              form.cigaretteButtsVolumeConversionFormulaVersion,
            cigaretteButtsInputSource: "unknown",
          })
      : normalizeCigaretteButtsMeasurementsFromUserInput(
          {
            cigaretteButtsCount: readValidCount(form.cigaretteButtsCount),
            cigaretteButtsMassKg: readValidMass(form.wasteMegotsKg),
            cigaretteButtsVolumeLiters: readValidMass(
              form.cigaretteButtsVolumeLiters,
            ),
            cigaretteButtsCondition: form.wasteMegotsCondition,
            cigaretteButtsInputSource: form.cigaretteButtsInputSource,
          },
          { existingMeasurements: buildExistingMeasurements(form) },
        );
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
    wasteReferenceStatus: resolveReferenceStatus(
      collectionReferences?.wastePerVolunteer,
      collectionReferences?.wasteSourceCount ?? 0,
      referencesLoading,
    ),
    wasteDeltaPercent: wasteComparison.deltaPercent,
    comparisonTone: wasteComparison.tone,
    megotsKg: cigaretteButtsMeasurements.cigaretteButtsMassKg,
    megotsCount: cigaretteButtsMeasurements.cigaretteButtsCount,
    megotsCurrentPerVolunteer: megotsComparison.currentPerVolunteer,
    megotsBenchmarkPerVolunteer: megotsComparison.benchmarkPerVolunteer,
    megotsBenchmarkSourceCount: collectionReferences?.buttsSourceCount ?? 0,
    megotsReferenceStatus: resolveReferenceStatus(
      collectionReferences?.buttsPerVolunteer,
      collectionReferences?.buttsSourceCount ?? 0,
      referencesLoading,
    ),
    megotsDeltaPercent: megotsComparison.deltaPercent,
    megotsComparisonTone: megotsComparison.tone,
    cigaretteButtsCountProvenance:
      cigaretteButtsMeasurements.cigaretteButtsCountProvenance,
    cigaretteButtsMassProvenance:
      cigaretteButtsMeasurements.cigaretteButtsMassProvenance,
    cigaretteButtsVolumeProvenance:
      cigaretteButtsMeasurements.cigaretteButtsVolumeProvenance,
    cigaretteButtsInputSource:
      cigaretteButtsMeasurements.cigaretteButtsInputSource ?? null,
    cigaretteButtsConversionFormulaVersion:
      cigaretteButtsMeasurements.cigaretteButtsConversionFormulaVersion,
    cigaretteButtsVolumeConversionFormulaVersion:
      cigaretteButtsMeasurements.cigaretteButtsVolumeConversionFormulaVersion ?? null,
    megotsCounted: cigaretteButtsMeasurements.cigaretteButtsLotsSummary?.countedCount ?? 0,
    megotsEstimated: cigaretteButtsMeasurements.cigaretteButtsLotsSummary?.estimatedCount ?? 0,
    megotsMeasuredMassKg: cigaretteButtsMeasurements.cigaretteButtsLotsSummary?.measuredMassKg ?? 0,
    megotsEstimatedMassKg: cigaretteButtsMeasurements.cigaretteButtsLotsSummary?.estimatedMassKg ?? 0,
    megotsLotResults: cigaretteButtsMeasurements.cigaretteButtsLotResults ?? [],
    hasExplicitMegotsLots: form.cigaretteButtsLots !== null,
  };
}

export function useHarvestLogic({
  form,
  updateFields,
}: UseHarvestLogicParams): UseHarvestLogicResult {
  const { collectionReferences = null, isLoading = false } = useActionPollutionScoreReferences();

  const derived = useMemo(
    () => deriveHarvestMetrics(form, collectionReferences, isLoading),
    [form, collectionReferences, isLoading],
  );

  const addMegotsLot = useCallback(() => {
    const currentLots = form.cigaretteButtsLots ?? buildLegacyLotDraft(form);
    if (form.cigaretteButtsLots === null && currentLots.length === 0 &&
      (form.cigaretteButtsCount.trim() && form.wasteMegotsKg.trim())) {
      return;
    }
    const id = typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `lot-${Date.now()}-${currentLots.length}`;
    updateFields({
      cigaretteButtsLots: [...currentLots, { id, source: "count", value: "", condition: form.wasteMegotsCondition }],
      ...buildLotMirrorUpdates(currentLots),
    });
  }, [form, updateFields]);

  const updateMegotsLot = useCallback((id: string, patch: Partial<Omit<CigaretteButtsLotDraft, "id">>) => {
    const currentLots = form.cigaretteButtsLots ?? buildLegacyLotDraft(form);
    const nextLots = currentLots.map((lot) => lot.id === id ? { ...lot, ...patch } : lot);
    updateFields({ cigaretteButtsLots: nextLots, ...buildLotMirrorUpdates(nextLots) });
  }, [form, updateFields]);

  const removeMegotsLot = useCallback((id: string) => {
    const currentLots = form.cigaretteButtsLots ?? buildLegacyLotDraft(form);
    const nextLots = currentLots.filter((lot) => lot.id !== id);
    updateFields({ cigaretteButtsLots: nextLots, ...buildLotMirrorUpdates(nextLots) });
  }, [form, updateFields]);

  const moveMegotsLot = useCallback((id: string, direction: -1 | 1) => {
    const currentLots = form.cigaretteButtsLots ?? buildLegacyLotDraft(form);
    const index = currentLots.findIndex((lot) => lot.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= currentLots.length) return;
    const nextLots = [...currentLots];
    const [lot] = nextLots.splice(index, 1);
    nextLots.splice(nextIndex, 0, lot!);
    updateFields({ cigaretteButtsLots: nextLots, ...buildLotMirrorUpdates(nextLots) });
  }, [form, updateFields]);

  const syncMegotsWeightFromWeight = useCallback(
    (rawValue: string) => {
      const mass = rawValue.trim() === "" ? null : readValidMass(rawValue);
      const normalized = normalizeCigaretteButtsMeasurementsFromUserInput({
        cigaretteButtsMassKg: mass,
        cigaretteButtsCondition: form.wasteMegotsCondition,
        cigaretteButtsInputSource: rawValue.trim() === "" ? null : "mass",
      }, {
        existingMeasurements: buildExistingMeasurements(form),
      });
      updateFields({
        wasteMegotsKg: rawValue,
        cigaretteButtsInputSource: rawValue.trim() === ""
          ? normalized.cigaretteButtsInputSource ?? null
          : normalized.cigaretteButtsInputSource ?? "mass_kg",
        cigaretteButtsCount: normalized.cigaretteButtsCount === null
          ? ""
          : String(normalized.cigaretteButtsCount),
        cigaretteButtsVolumeLiters: normalized.cigaretteButtsVolumeLiters === null
          ? ""
          : formatDerivedNumber(normalized.cigaretteButtsVolumeLiters),
        ...buildMeasurementContextUpdates(normalized),
      });
    },
    [form, updateFields],
  );

  const syncMegotsWeightFromCount = useCallback(
    (rawValue: string) => {
      const count = rawValue.trim() === "" ? null : readValidCount(rawValue);
      const normalized = normalizeCigaretteButtsMeasurementsFromUserInput({
        cigaretteButtsCount: count,
        cigaretteButtsCondition: form.wasteMegotsCondition,
        cigaretteButtsInputSource: rawValue.trim() === "" ? null : "count",
      }, {
        existingMeasurements: buildExistingMeasurements(form),
      });
      updateFields({
        cigaretteButtsCount: rawValue,
        cigaretteButtsInputSource: rawValue.trim() === ""
          ? normalized.cigaretteButtsInputSource ?? null
          : normalized.cigaretteButtsInputSource ?? "count",
        wasteMegotsKg: normalized.cigaretteButtsMassKg === null
          ? ""
          : formatDerivedNumber(normalized.cigaretteButtsMassKg),
        cigaretteButtsVolumeLiters: normalized.cigaretteButtsVolumeLiters === null
          ? ""
          : formatDerivedNumber(normalized.cigaretteButtsVolumeLiters),
        ...buildMeasurementContextUpdates(normalized),
      });
    },
    [form, updateFields],
  );

  const syncMegotsVolume = useCallback(
    (rawValue: string) => {
      const normalized = normalizeCigaretteButtsMeasurementsFromUserInput({
        cigaretteButtsVolumeLiters: rawValue.trim() === "" ? null : readValidMass(rawValue),
        cigaretteButtsCondition: form.wasteMegotsCondition,
        cigaretteButtsInputSource: rawValue.trim() === "" ? null : "volume_l",
      }, {
        existingMeasurements: buildExistingMeasurements(form),
      });
      updateFields({
        cigaretteButtsVolumeLiters: rawValue,
        cigaretteButtsInputSource: rawValue.trim() === ""
          ? normalized.cigaretteButtsInputSource ?? null
          : normalized.cigaretteButtsInputSource ?? "volume_l",
        cigaretteButtsCount: normalized.cigaretteButtsCount === null
          ? ""
          : String(normalized.cigaretteButtsCount),
        wasteMegotsKg: normalized.cigaretteButtsMassKg === null
          ? ""
          : formatDerivedNumber(normalized.cigaretteButtsMassKg),
        ...buildMeasurementContextUpdates(normalized),
      });
    },
    [form, updateFields],
  );

  const syncMegotsCondition = useCallback(
    (rawValue: ActionMegotsCondition) => {
      const source = form.cigaretteButtsInputSource;
      const count = source === "count" ? readValidCount(form.cigaretteButtsCount) : null;
      const mass = (source === "mass" || source === "mass_kg") ? readValidMass(form.wasteMegotsKg) : null;
      const volume = source === "volume_l" ? readValidMass(form.cigaretteButtsVolumeLiters) : null;
      const normalized = source === "count" && count !== null
        ? normalizeCigaretteButtsMeasurementsFromUserInput({
            cigaretteButtsCount: count,
            cigaretteButtsCondition: rawValue,
            cigaretteButtsInputSource: "count",
          }, { existingMeasurements: buildExistingMeasurements(form) })
        : (source === "mass" || source === "mass_kg") && mass !== null
          ? normalizeCigaretteButtsMeasurementsFromUserInput({
              cigaretteButtsMassKg: mass,
              cigaretteButtsCondition: rawValue,
              cigaretteButtsInputSource: "mass",
            }, { existingMeasurements: buildExistingMeasurements(form) })
          : source === "volume_l" && volume !== null
            ? normalizeCigaretteButtsMeasurementsFromUserInput({
                cigaretteButtsVolumeLiters: volume,
                cigaretteButtsCondition: rawValue,
                cigaretteButtsInputSource: "volume_l",
              }, { existingMeasurements: buildExistingMeasurements(form) })
          : null;

      updateFields({
        wasteMegotsCondition: rawValue,
        cigaretteButtsCondition: rawValue,
        ...(normalized ? buildMeasurementContextUpdates(normalized) : {}),
        ...(normalized
          ? {
              cigaretteButtsCount: normalized.cigaretteButtsCount === null ? "" : String(normalized.cigaretteButtsCount),
              wasteMegotsKg: normalized.cigaretteButtsMassKg === null ? "" : formatDerivedNumber(normalized.cigaretteButtsMassKg),
              cigaretteButtsVolumeLiters: normalized.cigaretteButtsVolumeLiters === null ? "" : formatDerivedNumber(normalized.cigaretteButtsVolumeLiters),
            }
          : {}),
      });
    },
    [form, updateFields],
  );

  return {
    ...derived,
    syncMegotsWeightFromWeight,
    syncMegotsWeightFromCount,
    syncMegotsVolume,
    syncMegotsCondition,
    addMegotsLot,
    updateMegotsLot,
    removeMegotsLot,
    moveMegotsLot,
  };
}
