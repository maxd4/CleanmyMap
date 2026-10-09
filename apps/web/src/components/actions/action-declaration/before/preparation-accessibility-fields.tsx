import type { BaseSectionProps } from "./section-contract";
import { FieldShell } from "./ui";

const ACCESSIBILITY_OPTIONS = [
  { value: "not_evaluated", label: "Non évaluée" },
  { value: "conditions_reported", label: "Conditions d'accès renseignées" },
  { value: "obstacles_identified", label: "Obstacles identifiés" },
  { value: "to_confirm", label: "À confirmer" },
] as const;

const inputClassName = "w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white";

export function PreparationAccessibilityFields({ form, updateField }: BaseSectionProps) {
  return (
    <div className="space-y-4">
      <FieldShell
        label="État de l'accessibilité"
        hint="Cette observation ne constitue pas une certification PMR. Décrivez les conditions réellement observées."
      >
        <select
          value={form.accessibilityStatus}
          onChange={(event) => updateField("accessibilityStatus", event.target.value as typeof form.accessibilityStatus)}
          className={inputClassName}
        >
          {ACCESSIBILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </FieldShell>

      <FieldShell label="Accès, obstacles et conditions observées">
        <textarea
          value={form.accessibility}
          onChange={(event) => updateField("accessibility", event.target.value)}
          className={`${inputClassName} min-h-[132px]`}
          placeholder="Ex. Escalier à éviter, sol irrégulier, accès possible par la rue latérale..."
        />
      </FieldShell>

      <FieldShell label="Consignes de sécurité">
        <textarea
          value={form.safetyInstructions}
          onChange={(event) => updateField("safetyInstructions", event.target.value)}
          className={`${inputClassName} min-h-[132px]`}
          placeholder="Ex. Ne pas traverser la voie ferrée, rester en groupe, gilets visibles..."
        />
      </FieldShell>
    </div>
  );
}
