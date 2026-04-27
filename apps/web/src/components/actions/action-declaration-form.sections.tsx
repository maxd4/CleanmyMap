import type {
  ActionMegotsCondition,
  ActionPhotoAsset,
  ActionVisionEstimate,
} from "@/lib/actions/types";
import type { FormState } from "./action-declaration-form.model";
import { toRequiredNumber } from "./action-declaration-form.model";
import { ActionDeclarationPhotoSection } from "./action-declaration-form.photo-section";
import { ActionDeclarationVisionFields } from "./action-declaration-form.vision-fields";

type UpdateField = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;

type CompleteModeFieldsProps = {
  isQuickMode: boolean;
  form: FormState;
  updateField: UpdateField;
  photoAssets: ActionPhotoAsset[];
  visionEstimate: ActionVisionEstimate | null;
  visionStatus: "idle" | "processing" | "ready" | "error";
  onPhotoUpload: (files: FileList | null) => void;
  onClearPhotos: () => void;
};

export function ActionDeclarationMegotsSection({
  form,
  updateField,
}: {
  form: FormState;
  updateField: UpdateField;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
        Mégots (kg)
        <input
          type="number"
          step="0.01"
          min="0"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 cmm-text-primary outline-none transition focus:border-emerald-500"
          value={form.wasteMegotsKg}
          onChange={(event) => updateField("wasteMegotsKg", event.target.value)}
          placeholder="0.5"
        />
      </label>

      <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
        État
        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 cmm-text-primary outline-none transition focus:border-emerald-500"
          value={form.wasteMegotsCondition}
          onChange={(event) =>
            updateField(
              "wasteMegotsCondition",
              event.target.value as ActionMegotsCondition,
            )
          }
        >
          <option value="propre">Propre</option>
          <option value="humide">Humide</option>
          <option value="mouille">Mouillé</option>
        </select>
      </label>
    </div>
  );
}

export function ActionDeclarationCompleteModeFields({
  isQuickMode,
  form,
  updateField,
  photoAssets,
  visionEstimate,
  visionStatus,
  onPhotoUpload,
  onClearPhotos,
}: CompleteModeFieldsProps) {
  if (isQuickMode) {
    return null;
  }

  return (
    <>
      <ActionDeclarationPhotoSection
        photoAssets={photoAssets}
        visionEstimate={visionEstimate}
        visionStatus={visionStatus}
        onPhotoUpload={onPhotoUpload}
        onClearPhotos={onClearPhotos}
      />

      <ActionDeclarationVisionFields
        form={form}
        onVisionBagsCountChange={(value) => updateField("visionBagsCount", value)}
        onVisionFillLevelChange={(value) => updateField("visionFillLevel", value)}
        onVisionDensityChange={(value) => updateField("visionDensity", value)}
      />

      <label className="mt-4 flex flex-col gap-2 cmm-text-small font-bold cmm-text-secondary">
        Durée (minutes) <span className="text-emerald-500">*</span>
        <input
          type="number"
          min="5"
          className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 cmm-text-primary outline-none transition focus:border-emerald-500 focus:bg-white shadow-sm"
          value={form.durationMinutes}
          onChange={(event) => updateField("durationMinutes", event.target.value)}
        />
      </label>
    </>
  );
}
