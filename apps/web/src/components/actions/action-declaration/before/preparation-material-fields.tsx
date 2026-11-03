import { ACTION_MATERIAL_SUGGESTIONS } from "@/lib/actions/preparation-contract";
import { CmmField, CmmTextarea } from "@/components/ui/cmm-field";
import type { BaseSectionProps } from "./section-contract";
import {
  characterLimitError,
  characterLimitHint,
  PREPARATION_FIELD_LIMITS,
} from "./preparation-field-utils";

export function PreparationMaterialFields({ form, updateField }: BaseSectionProps) {
  const providedError = characterLimitError(
    form.materialsProvided,
    "Le matériel fourni",
    PREPARATION_FIELD_LIMITS.materialsProvided,
  );
  const recommendedError = characterLimitError(
    form.recommendedMaterials,
    "Le complément matériel",
    PREPARATION_FIELD_LIMITS.recommendedMaterials,
  );

  const toggleSuggestion = (value: (typeof ACTION_MATERIAL_SUGGESTIONS)[number]["value"]) => {
    const next = form.suggestedMaterials.includes(value)
      ? form.suggestedMaterials.filter((item) => item !== value)
      : [...form.suggestedMaterials, value];
    updateField("suggestedMaterials", next);
  };

  return (
    <div className="space-y-4">
      <CmmField
        id="before-materials-provided"
        label="Matériel fourni par l'organisateur"
        hint={`Disponible sur place. ${characterLimitHint(form.materialsProvided, PREPARATION_FIELD_LIMITS.materialsProvided)}`}
        error={providedError}
      >
        <CmmTextarea
          value={form.materialsProvided}
          onChange={(event) => updateField("materialsProvided", event.target.value)}
          rows={2}
          maxLength={PREPARATION_FIELD_LIMITS.materialsProvided}
          placeholder="Ex. Sacs renforcés et pinces disponibles au point de rendez-vous..."
        />
      </CmmField>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-emerald-950">Matériel à apporter par les bénévoles</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ACTION_MATERIAL_SUGGESTIONS.map((option) => (
            <label key={option.value} className="flex min-h-11 items-center gap-2 rounded-xl border border-emerald-100 bg-white/70 px-3 py-2 text-sm font-medium text-emerald-950">
              <input
                type="checkbox"
                checked={form.suggestedMaterials.includes(option.value)}
                onChange={() => toggleSuggestion(option.value)}
                className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <CmmField
        id="before-materials-complement"
        label="Complément libre à apporter (facultatif)"
        hint={`À apporter. ${characterLimitHint(form.recommendedMaterials, PREPARATION_FIELD_LIMITS.recommendedMaterials)}`}
        error={recommendedError}
      >
        <CmmTextarea
          value={form.recommendedMaterials}
          onChange={(event) => updateField("recommendedMaterials", event.target.value)}
          rows={2}
          maxLength={PREPARATION_FIELD_LIMITS.recommendedMaterials}
          placeholder="Ex. Eau, chaussures adaptées, protections complémentaires..."
        />
      </CmmField>
    </div>
  );
}
