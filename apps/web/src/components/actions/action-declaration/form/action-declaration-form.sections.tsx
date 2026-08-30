import type {
  ActionMegotsCondition,
  ActionPhotoAsset,
  ActionVisionEstimate,
} from "@/lib/actions/types";
import type { FormState } from "./model";
import { ActionDeclarationPhotoSection } from "./action-declaration-form.photo-section";
import { ActionDeclarationVisionFields } from "./action-declaration-form.vision-fields";
import { CmmField, CmmInput, CmmSelect } from "@/components/ui/cmm-field";

type UpdateField = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;

type CompleteModeFieldsProps = {
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
      <CmmField label="Mégots (kg)">
        <CmmInput
          type="number"
          step="0.01"
          min="0"
          value={form.wasteMegotsKg}
          onChange={(event) => updateField("wasteMegotsKg", event.target.value)}
          placeholder="0.5"
        />
      </CmmField>

      <CmmField label="État">
        <CmmSelect
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
        </CmmSelect>
      </CmmField>
    </div>
  );
}

export function ActionDeclarationCompleteModeFields({
  form,
  updateField,
  photoAssets,
  visionEstimate,
  visionStatus,
  onPhotoUpload,
  onClearPhotos,
}: CompleteModeFieldsProps) {
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
        onVisionFillLevelChange={(value) =>
          updateField("visionFillLevel", value as FormState["visionFillLevel"])
        }
        onVisionDensityChange={(value) =>
          updateField("visionDensity", value as FormState["visionDensity"])
        }
      />

      <CmmField className="mt-4" label="Durée (minutes)" required>
        <CmmInput
          type="number"
          min="5"
          value={form.durationMinutes}
          onChange={(event) => updateField("durationMinutes", event.target.value)}
        />
      </CmmField>
    </>
  );
}
