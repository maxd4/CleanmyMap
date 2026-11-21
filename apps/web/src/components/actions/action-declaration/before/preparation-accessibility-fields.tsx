import type { BaseSectionProps } from "./section-contract";
import { CmmField, CmmSelect, CmmTextarea } from "@/components/ui/cmm-field";
import {
  characterLimitError,
  characterLimitHint,
  PREPARATION_FIELD_LIMITS,
} from "./preparation-field-utils";

const ACCESSIBILITY_OPTIONS = [
  { value: "not_evaluated", label: "Non évaluée" },
  { value: "conditions_reported", label: "Conditions d'accès renseignées" },
  { value: "obstacles_identified", label: "Obstacles identifiés" },
  { value: "to_confirm", label: "À confirmer" },
] as const;

export function PreparationAccessibilityFields({ form, updateField }: BaseSectionProps) {
  const hasAccessibilityDetail = form.accessibility.trim().length > 0 || form.accessibilityStatus !== "not_evaluated";
  const accessibilityError = characterLimitError(
    form.accessibility,
    "La précision d'accessibilité",
    PREPARATION_FIELD_LIMITS.accessibility,
  );

  return (
    <div className="space-y-3">
      <CmmField
        id="before-accessibility-status"
        label="État de l'accessibilité"
        hint="Observation, pas certification PMR."
      >
        <CmmSelect
          value={form.accessibilityStatus}
          onChange={(event) => updateField("accessibilityStatus", event.target.value as typeof form.accessibilityStatus)}
        >
          {ACCESSIBILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </CmmSelect>
      </CmmField>

      {hasAccessibilityDetail ? (
        <CmmField
          id="before-accessibility-details"
          label="Précisions d'accessibilité"
          hint={`Indiquez les accès, obstacles, source et date de vérification si connus. Ne saisissez aucune donnée personnelle ou médicale. ${characterLimitHint(form.accessibility, PREPARATION_FIELD_LIMITS.accessibility)}`}
          error={accessibilityError}
        >
          <CmmTextarea
            value={form.accessibility}
            onChange={(event) => updateField("accessibility", event.target.value)}
            rows={2}
            maxLength={PREPARATION_FIELD_LIMITS.accessibility}
            placeholder="Ex. Escalier à éviter, sol irrégulier, accès possible par la rue latérale (vérifié le … auprès de …)."
          />
        </CmmField>
      ) : (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-xs leading-5 text-emerald-900/70">
          Évaluation non demandée. Une description reprise reste affichée.
        </p>
      )}
      {form.accessibilityRouteVersionOptions.length > 0 ? (
        <CmmField id="before-accessibility-alternative-route" label="Itinéraire alternatif déjà enregistré" hint="Facultatif. Réutilise une version enregistrée du parcours; ne garantit pas son accessibilité actuelle.">
          <CmmSelect
            value={form.accessibilityAlternativeRouteVersionId}
            onChange={(event) => updateField("accessibilityAlternativeRouteVersionId", event.target.value)}
          >
            <option value="">Aucun itinéraire alternatif indiqué</option>
            {form.accessibilityRouteVersionOptions.map((option) => (
              <option key={option.versionId} value={option.versionId}>{option.label}</option>
            ))}
          </CmmSelect>
        </CmmField>
      ) : null}
    </div>
  );
}
