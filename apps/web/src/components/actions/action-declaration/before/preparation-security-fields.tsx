import { ActionSafetyGuide } from "@/components/actions/action-safety-guide";
import { CmmField, CmmTextarea } from "@/components/ui/cmm-field";
import type { BaseSectionProps } from "./section-contract";
import {
  characterLimitError,
  characterLimitHint,
  PREPARATION_FIELD_LIMITS,
} from "./preparation-field-utils";

export function PreparationSecurityFields({
  form,
  updateField,
  showGuide = true,
}: BaseSectionProps & { showGuide?: boolean }) {
  const safetyError = characterLimitError(
    form.safetyInstructions,
    "Les consignes particulières",
    PREPARATION_FIELD_LIMITS.safetyInstructions,
  );

  return (
    <div className="space-y-4">
      {showGuide ? <ActionSafetyGuide categories={form.wasteCategories} schoolContextConfirmed={form.schoolContextConfirmed} /> : null}

      <CmmField
        id="before-safety-instructions"
        label="Consignes particulières de l'organisateur"
        hint={`Consignes pour le groupe. ${characterLimitHint(form.safetyInstructions, PREPARATION_FIELD_LIMITS.safetyInstructions)}`}
        error={safetyError}
      >
        <CmmTextarea
          value={form.safetyInstructions}
          onChange={(event) => updateField("safetyInstructions", event.target.value)}
          rows={2}
          maxLength={PREPARATION_FIELD_LIMITS.safetyInstructions}
          placeholder="Ex. Rester en groupe, porter les gilets visibles et signaler toute zone dangereuse."
        />
      </CmmField>
    </div>
  );
}
