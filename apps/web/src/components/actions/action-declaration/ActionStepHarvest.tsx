"use client";

import type { FormState } from "../action-declaration-form.model";
import type {
  ActionPhotoAsset,
  ActionVisionEstimate,
} from "@/lib/actions/types";
import type { UpdateFormField } from "./types";
import { useHarvestLogic } from "./hooks/use-harvest-logic";
import { HarvestCleanPlaceSection } from "./sections/harvest-clean-place";
import { HarvestMegotsSection } from "./sections/harvest-megots-section";
import { HarvestPhotoSection } from "./sections/harvest-photo-section";
import { HarvestWasteSection } from "./sections/harvest-waste-section";

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
    cigaretteButtsCount,
    megotsKg,
    megotsCount,
    megotsCurrentPerVolunteer,
    megotsDeltaPercent,
    comparisonTone,
    confidenceLabel,
    sourceLabel,
    syncMegotsWeightFromWeight,
    syncMegotsWeightFromCount,
    syncMegotsCondition,
  } = harvest;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
            wastePlastiqueKg={form.wastePlastiqueKg}
            wasteVerreKg={form.wasteVerreKg}
            wasteMetalKg={form.wasteMetalKg}
            wasteMixteKg={form.wasteMixteKg}
            triQuality={form.triQuality}
            notes={form.notes}
            onTriChange={(key, value) => updateField(key, value)}
          />
          <HarvestMegotsSection
            wasteMegotsKg={form.wasteMegotsKg}
            wasteMegotsCondition={form.wasteMegotsCondition}
            megotsKg={megotsKg}
            megotsCount={megotsCount}
            cigaretteButtsCount={cigaretteButtsCount}
            comparisonTone={comparisonTone}
            megotsCurrentPerVolunteer={megotsCurrentPerVolunteer}
            wasteBenchmarkPerVolunteer={wasteBenchmarkPerVolunteer}
            megotsDeltaPercent={megotsDeltaPercent}
            wasteBenchmarkKg={wasteBenchmarkKg}
            sourceLabel={sourceLabel}
            confidenceLabel={confidenceLabel}
            onMegotsWeightChange={syncMegotsWeightFromWeight}
            onMegotsCountChange={syncMegotsWeightFromCount}
            onMegotsConditionChange={syncMegotsCondition}
          />
        </div>
      )}

      <HarvestPhotoSection
        photoAssets={photoAssets}
        visionEstimate={visionEstimate}
        visionStatus={visionStatus}
        estimatedWasteKgInterval={estimatedWasteKgInterval}
        hasPhotos={hasPhotos}
        onPhotoUpload={onPhotoUpload}
        onClearPhotos={onClearPhotos}
      />
    </div>
  );
}


