"use client";

import type { FormState } from "../model";
import type { ValidationIssue } from "../model";
import type {
  ActionPhotoAsset,
  ActionVisionEstimate,
} from "@/lib/actions/types";
import type { UpdateFormField } from "../types";
import {
  useHarvestLogic,
  type UseHarvestLogicResult,
} from "../hooks/use-harvest-logic";
import { HarvestCleanPlaceSection } from "../sections/harvest-clean-place";
import { HarvestMegotsSection } from "../sections/harvest-megots-section";
import { HarvestPhotoSection } from "../sections/harvest-photo-section";
import { HarvestWasteSection } from "../sections/harvest-waste-section";
import { Cigarette } from "lucide-react";
import { MAX_CIGARETTE_BUTTS_COUNT } from "@/lib/waste/cigarette-butts";
import { ACTION_MEASUREMENT_MAX_KG, ACTION_WASTE_MASS_RESOLUTION_KG } from "@/lib/waste";
import { HarvestMeasurementSlider } from "../ui/harvest-measurement-slider";
import {
  HARVEST_BUTTS_SLIDER_EXTENSION_COUNT,
  HARVEST_BUTTS_SLIDER_INITIAL_MAX_COUNT,
  HARVEST_WASTE_SLIDER_EXTENSION_KG,
  HARVEST_WASTE_SLIDER_INITIAL_MAX_KG,
  formatCount,
  formatKg,
} from "../utils/harvest-utils";

interface ActionStepHarvestProps {
  form: FormState;
  updateField: UpdateFormField;
  updateFields: (updates: Partial<FormState>) => void;
  recordType: FormState["recordType"];
  photoAssets: ActionPhotoAsset[];
  visionEstimate: ActionVisionEstimate | null;
  visionStatus: "idle" | "processing" | "ready" | "error";
  photoError: string | null;
  estimatedWasteKgInterval: [number, number] | null;
  onPhotoUpload: (files: FileList | null) => void;
  onPhotoReplace: (photoId: string, file: File | null) => void;
  onRemovePhoto: (photoId: string) => void;
  onClearPhotos: () => void;
  validationIssues: ValidationIssue[];
  mode?: "all" | "essentials" | "collection" | "photos" | "details";
}

function HarvestEssentials({
  form,
  updateField,
  isCleanPlaceMode,
  syncMegotsWeightFromCount,
  syncMegotsWeightFromWeight,
}: Pick<ActionStepHarvestProps, "form" | "updateField"> & {
  isCleanPlaceMode: boolean;
  syncMegotsWeightFromCount: (value: string) => void;
  syncMegotsWeightFromWeight: (value: string) => void;
}) {
  if (isCleanPlaceMode) return <HarvestCleanPlaceSection />;
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <HarvestMeasurementSlider
        id="harvest-waste-kg"
        exactInputId="harvest-waste-kg-exact"
        exactInputLabel="Saisie exacte (kg)"
        exactInputMode="decimal"
        label="Masse collectée"
        value={form.wasteKg}
        initialMax={HARVEST_WASTE_SLIDER_INITIAL_MAX_KG}
        extension={HARVEST_WASTE_SLIDER_EXTENSION_KG}
        absoluteMax={ACTION_MEASUREMENT_MAX_KG}
        step={ACTION_WASTE_MASS_RESOLUTION_KG}
        unit="kg"
        accent="emerald"
        formatValue={formatKg}
        onChange={(value) => updateField("wasteKg", value)}
      />
      <HarvestMeasurementSlider
        id="harvest-megots-count-slider"
        exactInputId="harvest-megots-count"
        exactInputLabel="Saisie exacte (mégots)"
        label="Nombre de mégots"
        value={form.cigaretteButtsCount}
        initialMax={HARVEST_BUTTS_SLIDER_INITIAL_MAX_COUNT}
        extension={HARVEST_BUTTS_SLIDER_EXTENSION_COUNT}
        absoluteMax={MAX_CIGARETTE_BUTTS_COUNT}
        step={1}
        unit="mégots"
        accent="blue"
        formatValue={formatCount}
        onChange={syncMegotsWeightFromCount}
      />
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
          max={ACTION_MEASUREMENT_MAX_KG}
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

type HarvestStepContentProps = ActionStepHarvestProps & {
  isCleanPlaceMode: boolean;
  hasPhotos: boolean;
  harvest: UseHarvestLogicResult;
};

function HarvestStepContent({
  form,
  updateField,
  photoAssets,
  visionEstimate,
  visionStatus,
  photoError,
  estimatedWasteKgInterval,
  onPhotoUpload,
  onPhotoReplace,
  onRemovePhoto,
  onClearPhotos,
  validationIssues,
  mode = "all",
  isCleanPlaceMode,
  hasPhotos,
  harvest,
}: HarvestStepContentProps) {
  const {
    wasteCurrentPerVolunteer,
    wasteBenchmarkPerVolunteer,
    wasteBenchmarkSourceCount,
    wasteDeltaPercent,
    comparisonTone,
    megotsKg,
    megotsCount,
    megotsCurrentPerVolunteer,
    megotsBenchmarkPerVolunteer,
    megotsBenchmarkSourceCount,
    megotsDeltaPercent,
    megotsComparisonTone,
    cigaretteButtsCountProvenance,
    cigaretteButtsMassProvenance,
    cigaretteButtsVolumeProvenance,
    cigaretteButtsConversionFormulaVersion,
    megotsCounted,
    megotsEstimated,
    megotsMeasuredMassKg,
    megotsEstimatedMassKg,
    syncMegotsWeightFromWeight,
    syncMegotsWeightFromCount,
    syncMegotsCondition,
  } = harvest;

  if (mode === "essentials") {
    return (
      <HarvestEssentials
        form={form}
        updateField={updateField}
        isCleanPlaceMode={isCleanPlaceMode}
        syncMegotsWeightFromCount={syncMegotsWeightFromCount}
        syncMegotsWeightFromWeight={syncMegotsWeightFromWeight}
      />
    );
  }

  if (mode === "photos") {
    return (
      <HarvestPhotoSection
        photoAssets={photoAssets}
        visionEstimate={visionEstimate}
        visionStatus={visionStatus}
        photoError={photoError}
        estimatedWasteKgInterval={estimatedWasteKgInterval}
        hasPhotos={hasPhotos}
        onPhotoUpload={onPhotoUpload}
        onPhotoReplace={onPhotoReplace}
        onRemovePhoto={onRemovePhoto}
        onClearPhotos={onClearPhotos}
      />
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {isCleanPlaceMode ? (
        <HarvestCleanPlaceSection />
      ) : (
        <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-2">
          <HarvestWasteSection
            wasteKg={form.wasteKg}
            onWasteKgChange={(value) => updateField("wasteKg", value)}
            wasteMeasurementMethod={form.wasteMeasurementMethod}
            wasteRecyclablesKg={form.wasteRecyclablesKg}
            wasteGlassKg={form.wasteGlassKg}
            wasteHouseholdKg={form.wasteHouseholdKg}
            wasteOtherKg={form.wasteOtherKg}
            wasteCharacterizationKg={form.wasteCharacterizationKg}
            wasteUnusualObjects={form.wasteUnusualObjects}
            wasteSpecialHandlingWaste={form.wasteSpecialHandlingWaste}
            onMeasurementMethodChange={(value) => updateField("wasteMeasurementMethod", value)}
            notes={form.notes}
            onTriChange={(key, value) => updateField(key, value)}
            hidePrimaryMeasurement={mode === "collection" || mode === "details"}
            wasteCurrentPerVolunteer={wasteCurrentPerVolunteer}
            wasteBenchmarkPerVolunteer={wasteBenchmarkPerVolunteer}
            wasteBenchmarkSourceCount={wasteBenchmarkSourceCount}
            wasteDeltaPercent={wasteDeltaPercent}
            comparisonTone={comparisonTone}
            validationIssues={validationIssues}
          />
          <HarvestMegotsSection
            wasteMegotsKg={form.wasteMegotsKg}
            cigaretteButtsVolumeLiters={form.cigaretteButtsVolumeLiters}
            wasteMegotsCondition={form.wasteMegotsCondition}
            cigaretteButtsCount={form.cigaretteButtsCount}
            megotsKg={megotsKg}
            megotsCount={megotsCount}
            megotsCurrentPerVolunteer={megotsCurrentPerVolunteer}
            megotsBenchmarkPerVolunteer={megotsBenchmarkPerVolunteer}
            megotsBenchmarkSourceCount={megotsBenchmarkSourceCount}
            megotsDeltaPercent={megotsDeltaPercent}
            megotsComparisonTone={megotsComparisonTone}
            cigaretteButtsCountProvenance={cigaretteButtsCountProvenance}
            cigaretteButtsMassProvenance={cigaretteButtsMassProvenance}
            cigaretteButtsVolumeProvenance={cigaretteButtsVolumeProvenance}
            cigaretteButtsConversionFormulaVersion={cigaretteButtsConversionFormulaVersion}
            megotsLots={form.cigaretteButtsLots}
            megotsCounted={megotsCounted}
            megotsEstimated={megotsEstimated}
            megotsMeasuredMassKg={megotsMeasuredMassKg}
            megotsEstimatedMassKg={megotsEstimatedMassKg}
            onAddMegotsLot={harvest.addMegotsLot}
            onUpdateMegotsLot={harvest.updateMegotsLot}
            onRemoveMegotsLot={harvest.removeMegotsLot}
            onMoveMegotsLot={harvest.moveMegotsLot}
            onMegotsWeightChange={syncMegotsWeightFromWeight}
            onMegotsVolumeChange={harvest.syncMegotsVolume}
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
          photoError={photoError}
          estimatedWasteKgInterval={estimatedWasteKgInterval}
          hasPhotos={hasPhotos}
          onPhotoUpload={onPhotoUpload}
          onPhotoReplace={onPhotoReplace}
          onRemovePhoto={onRemovePhoto}
          onClearPhotos={onClearPhotos}
        />
      ) : null}
    </div>
  );
}

export function ActionStepHarvest(props: ActionStepHarvestProps) {
  const isCleanPlaceMode = props.recordType === "clean_place";
  const hasPhotos = props.photoAssets.length > 0;
  const harvest = useHarvestLogic({
    form: props.form,
    updateFields: props.updateFields,
  });

  return (
    <HarvestStepContent
      {...props}
      isCleanPlaceMode={isCleanPlaceMode}
      hasPhotos={hasPhotos}
      harvest={harvest}
    />
  );
}
