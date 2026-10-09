import { buildWasteFieldGuidance } from "@/lib/waste";
import { CmmField, CmmTextarea } from "@/components/ui/cmm-field";
import type { BaseSectionProps } from "./section-contract";
import {
  characterLimitError,
  characterLimitHint,
  PREPARATION_FIELD_LIMITS,
} from "./preparation-field-utils";

export function PreparationSecurityFields({ form, updateField }: BaseSectionProps) {
  const guidance = buildWasteFieldGuidance(form.wasteCategories);
  const dangerousGuidance = [...guidance.toAvoid, ...guidance.toReport];
  const hasGuidance = guidance.toPrepare.length > 0 || dangerousGuidance.length > 0;
  const safetyError = characterLimitError(
    form.safetyInstructions,
    "Les consignes particulières",
    PREPARATION_FIELD_LIMITS.safetyInstructions,
  );

  return (
    <div className="space-y-4">
      <aside
        aria-labelledby="before-safety-recommendations-title"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      >
        <p id="before-safety-recommendations-title" className="font-bold">
          Recommandations calculées depuis les déchets attendus
        </p>
        {hasGuidance ? (
          <div className="mt-2 space-y-1 leading-6">
            {guidance.toPrepare.length > 0 ? <p>Protections suggérées : {guidance.toPrepare.join(" · ")}</p> : null}
            {dangerousGuidance.length > 0 ? <p>Vigilances et interdictions : {dangerousGuidance.join(" · ")}</p> : null}
          </div>
        ) : (
          <p className="mt-2 leading-6">Aucune recommandation automatique pour les déchets attendus renseignés.</p>
        )}
        <p className="mt-2 text-xs leading-5 text-amber-900/75">
          Ces indications sont en lecture seule, restent séparées de vos consignes et ne sont pas enregistrées dans le texte organisateur.
        </p>
      </aside>

      <CmmField
        id="before-safety-instructions"
        label="Consignes particulières de l'organisateur"
        hint={`Consignes courtes et concrètes pour le groupe. ${characterLimitHint(form.safetyInstructions, PREPARATION_FIELD_LIMITS.safetyInstructions)}`}
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
