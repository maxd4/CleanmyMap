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
            onChange={(event) => {
              if (event.target.value !== form.accessibilityAlternativeRouteVersionId) {
                updateField("accessibilityAlternativeRouteVersionId", event.target.value);
                updateField("accessibilityStatus", "to_confirm");
                updateField("accessibilityConditionsVerifiedAt", "");
              }
            }}
          >
            <option value="">Aucun itinéraire alternatif indiqué</option>
            {form.accessibilityRouteVersionOptions.map((option) => (
              <option key={option.versionId} value={option.versionId}>{option.label}</option>
            ))}
          </CmmSelect>
        </CmmField>
      ) : null}
      <CmmField id="before-accessibility-condition-source" label="Source de vérification" hint="Nom d&apos;un service, gestionnaire ou source consultée; aucune donnée personnelle ou médicale.">
        <input id="before-accessibility-condition-source" value={form.accessibilityConditionsSource} maxLength={160} onChange={(event) => updateField("accessibilityConditionsSource", event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
      </CmmField>
      <CmmField id="before-accessibility-condition-date" label="Date de vérification des conditions">
        <input id="before-accessibility-condition-date" type="date" value={form.accessibilityConditionsVerifiedAt} onChange={(event) => updateField("accessibilityConditionsVerifiedAt", event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
      </CmmField>
      <p className="text-xs leading-5 text-amber-900">Une vérification ancienne ou un changement du tracé rend ces conditions incertaines. Renseignez « À confirmer » jusqu&apos;à une nouvelle vérification; aucune accessibilité actuelle n&apos;est garantie.</p>
      <CmmField id="before-accessibility-pause-plan" label="Modalités de pause">
        <CmmTextarea id="before-accessibility-pause-plan" value={form.accessibilityPausePlan} maxLength={500} rows={2} onChange={(event) => updateField("accessibilityPausePlan", event.target.value)} placeholder="Ex. pause possible au point de rendez-vous ou au point d'étape indiqué." />
      </CmmField>
      <CmmField id="before-accessibility-early-departure-plan" label="Sortie anticipée">
        <CmmTextarea id="before-accessibility-early-departure-plan" value={form.accessibilityEarlyDeparturePlan} maxLength={500} rows={2} onChange={(event) => updateField("accessibilityEarlyDeparturePlan", event.target.value)} placeholder="Ex. prévenir le référent d'accueil et rejoindre le point de sortie convenu." />
      </CmmField>
      <CmmField id="before-accessibility-alternative-missions" label="Missions alternatives prévues" hint="Une mission alternative est une option, pas une obligation de participation.">
        <CmmTextarea id="before-accessibility-alternative-missions" value={form.accessibilityAlternativeMissionsText} maxLength={960} rows={3} onChange={(event) => updateField("accessibilityAlternativeMissionsText", event.target.value)} placeholder="Une mission par ligne" />
      </CmmField>
    </div>
  );
}
