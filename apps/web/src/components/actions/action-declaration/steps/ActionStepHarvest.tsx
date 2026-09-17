"use client";

import type { FormState } from "../form/model";
import type {
  ActionPhotoAsset,
  ActionVisionEstimate,
} from "@/lib/actions/types";
import type { UpdateFormField } from "../types";
import { useHarvestLogic } from "../hooks/use-harvest-logic";
import { HarvestCleanPlaceSection } from "../sections/harvest-clean-place";
import { HarvestMegotsSection } from "../sections/harvest-megots-section";
import { HarvestPhotoSection } from "../sections/harvest-photo-section";
import { HarvestWasteSection } from "../sections/harvest-waste-section";
import { Cigarette, Trash2 } from "lucide-react";
import { CmmField, CmmInput } from "@/components/ui/cmm-field";
import { MAX_CIGARETTE_BUTTS_COUNT } from "@/lib/waste/cigarette-butts";

interface ActionStepHarvestProps {
  form: FormState;
  updateField: UpdateFormField;
  recordType: FormState["recordType"];
  photoAssets: ActionPhotoAsset[];
  visionEstimate: ActionVisionEstimate | null;
  visionStatus: "idle" | "processing" | "ready" | "error";
  heuristicEstimatedWasteKg: number;
  estimatedWasteKg: number;
  estimatedWasteKgInterval: [number, number] | null;
  estimatedWasteKgConfidence: number | null;
  wasteSuggestionSource: "vision" | "heuristic";
  onPhotoUpload: (files: FileList | null) => void;
  onClearPhotos: () => void;
  mode?: "all" | "essentials" | "collection" | "photos" | "details";
}

export function ActionStepHarvest({
  form,
  updateField,
  recordType,
  photoAssets,
  visionEstimate,
  visionStatus,
  heuristicEstimatedWasteKg,
  estimatedWasteKg,
  estimatedWasteKgInterval,
  estimatedWasteKgConfidence,
  wasteSuggestionSource,
  onPhotoUpload,
  onClearPhotos,
  mode = "all",
}: ActionStepHarvestProps) {
  const isCleanPlaceMode = recordType === "clean_place";
  const hasPhotos = photoAssets.length > 0;
  const harvest = useHarvestLogic({
    form,
    updateField,
    heuristicEstimatedWasteKg,
    estimatedWasteKg,
    estimatedWasteKgConfidence,
    wasteSuggestionSource,
  });
  const {
    wasteKgClamped,
    wasteBenchmarkKg,
    wasteCurrentPerVolunteer,
    wasteBenchmarkPerVolunteer,
    wasteDeltaPercent,
    megotsKg,
    megotsCount,
    megotsCurrentPerVolunteer,
    megotsDeltaPercent,
    cigaretteButtsCountProvenance,
    cigaretteButtsMassProvenance,
    cigaretteButtsConversionFormulaVersion,
    comparisonTone,
    confidenceLabel,
    sourceLabel,
    syncMegotsWeightFromWeight,
    syncMegotsWeightFromCount,
    syncMegotsCondition,
  } = harvest;

  if (mode === "essentials") {
    return isCleanPlaceMode ? (
      <HarvestCleanPlaceSection />
    ) : (
      <div className="grid gap-3 lg:grid-cols-3">
        <label className="space-y-1.5 rounded-2xl border border-emerald-200/70 bg-white p-4">
          <span className="flex items-center gap-2 text-xs font-semibold text-emerald-900/75">
            <Trash2 size={14} className="text-emerald-600" />
            Déchets hors mégots (kg)
          </span>
          <input
            id="harvest-waste-kg"
            inputMode="decimal"
            type="number"
            min="0"
            max="100"
            step="0.01"
            className="min-h-12 w-full rounded-xl border border-emerald-200 bg-white px-3.5 text-base font-bold text-emerald-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
            value={form.wasteKg}
            onChange={(event) => updateField("wasteKg", event.target.value)}
            placeholder="0"
          />
        </label>
        <CmmField
          label={(
            <span className="flex items-center gap-2">
              <Cigarette size={14} className="text-amber-600" />
              Nombre de mégots
            </span>
          )}
          hint={`Maximum ${MAX_CIGARETTE_BUTTS_COUNT.toLocaleString("fr-FR")} mégots.`}
        >
          <CmmInput
            id="harvest-megots-count"
            inputMode="numeric"
            type="number"
            min={0}
            max={MAX_CIGARETTE_BUTTS_COUNT}
            step={1}
            value={form.cigaretteButtsCount}
            onChange={(event) => syncMegotsWeightFromCount(event.target.value)}
            className="!min-h-12 !w-full !rounded-xl !border-emerald-200 !bg-white !px-3.5 !text-base !font-bold !text-emerald-950 focus:!border-amber-400 focus:!ring-2 focus:!ring-amber-500/15"
          />
        </CmmField>
        <label className="space-y-1.5 rounded-2xl border border-emerald-200/70 bg-white p-4">
          <span className="flex items-center gap-2 text-xs font-semibold text-emerald-900/75">
            <Cigarette size={14} className="text-amber-600" />
            Masse de mégots (kg)
          </span>
          <input
            id="harvest-megots-kg"
            inputMode="decimal"
            type="number"
            min="0"
            step="0.01"
            className="min-h-12 w-full rounded-xl border border-emerald-200 bg-white px-3.5 text-base font-bold text-emerald-950 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15"
            value={form.wasteMegotsKg}
            onChange={(event) => syncMegotsWeightFromWeight(event.target.value)}
            placeholder="0"
          />
        </label>
      </div>
    );
  }

  if (mode === "photos") {
    return (
      <HarvestPhotoSection
        photoAssets={photoAssets}
        visionEstimate={visionEstimate}
        visionStatus={visionStatus}
        estimatedWasteKgInterval={estimatedWasteKgInterval}
        hasPhotos={hasPhotos}
        onPhotoUpload={onPhotoUpload}
        onClearPhotos={onClearPhotos}
      />
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {isCleanPlaceMode ? (
        <HarvestCleanPlaceSection />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
          <HarvestWasteSection
            wasteKg={form.wasteKg}
            wasteKgClamped={wasteKgClamped}
            wasteBenchmarkKg={wasteBenchmarkKg}
            wasteCurrentPerVolunteer={wasteCurrentPerVolunteer}
            wasteBenchmarkPerVolunteer={wasteBenchmarkPerVolunteer}
            wasteDeltaPercent={wasteDeltaPercent}
            sourceLabel={sourceLabel}
            confidenceLabel={confidenceLabel}
            onWasteKgChange={(value) => updateField("wasteKg", value)}
            wasteMeasurementMethod={form.wasteMeasurementMethod}
            wasteRecyclablesKg={form.wasteRecyclablesKg}
            wasteGlassKg={form.wasteGlassKg}
            wasteHouseholdKg={form.wasteHouseholdKg}
            wasteOtherKg={form.wasteOtherKg}
            wasteUnusualObjects={form.wasteUnusualObjects}
            wasteSpecialHandlingWaste={form.wasteSpecialHandlingWaste}
            onMeasurementMethodChange={(value) => updateField("wasteMeasurementMethod", value)}
            notes={form.notes}
            wasteCategories={form.wasteCategories ?? []}
            onTriChange={(key, value) => updateField(key, value)}
            hidePrimaryMeasurement={mode === "collection" || mode === "details"}
          />
          <HarvestMegotsSection
            wasteMegotsKg={form.wasteMegotsKg}
            cigaretteButtsVolumeLiters={form.cigaretteButtsVolumeLiters}
            wasteMegotsCondition={form.wasteMegotsCondition}
            megotsKg={megotsKg}
            megotsCount={megotsCount}
            comparisonTone={comparisonTone}
            megotsCurrentPerVolunteer={megotsCurrentPerVolunteer}
            wasteBenchmarkPerVolunteer={wasteBenchmarkPerVolunteer}
            megotsDeltaPercent={megotsDeltaPercent}
            cigaretteButtsCountProvenance={cigaretteButtsCountProvenance}
            cigaretteButtsMassProvenance={cigaretteButtsMassProvenance}
            cigaretteButtsConversionFormulaVersion={cigaretteButtsConversionFormulaVersion}
            wasteBenchmarkKg={wasteBenchmarkKg}
            sourceLabel={sourceLabel}
            confidenceLabel={confidenceLabel}
            onMegotsWeightChange={syncMegotsWeightFromWeight}
            onMegotsVolumeChange={(value) => updateField("cigaretteButtsVolumeLiters", value)}
            onMegotsCountChange={syncMegotsWeightFromCount}
            onMegotsConditionChange={syncMegotsCondition}
            hidePrimaryMeasurements={mode === "collection" || mode === "details"}
          />
        </div>
      )}

      {mode === "all" || mode === "details" ? (
        <HarvestPhotoSection
          photoAssets={photoAssets}
          visionEstimate={visionEstimate}
          visionStatus={visionStatus}
          estimatedWasteKgInterval={estimatedWasteKgInterval}
          hasPhotos={hasPhotos}
          onPhotoUpload={onPhotoUpload}
          onClearPhotos={onClearPhotos}
        />
      ) : null}
    </div>
  );
}
