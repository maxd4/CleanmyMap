import { buildWasteFieldGuidance } from "@/lib/waste";
import { ACTION_MATERIAL_SUGGESTIONS } from "@/lib/actions/preparation-contract";
import type { BaseSectionProps } from "./section-contract";
import { FieldShell } from "./ui";

const inputClassName = "w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white";

export function PreparationMaterialFields({ form, updateField }: BaseSectionProps) {
  const guidance = buildWasteFieldGuidance(form.wasteCategories);

  const toggleSuggestion = (value: (typeof ACTION_MATERIAL_SUGGESTIONS)[number]["value"]) => {
    const next = form.suggestedMaterials.includes(value)
      ? form.suggestedMaterials.filter((item) => item !== value)
      : [...form.suggestedMaterials, value];
    updateField("suggestedMaterials", next);
  };

  return (
    <div className="space-y-4">
      <FieldShell
        label="Matériel fourni par l'organisateur"
        hint="Indiquez ce qui est effectivement disponible sur place, sans le confondre avec ce qui est conseillé."
      >
        <textarea
          value={form.materialsProvided}
          onChange={(event) => updateField("materialsProvided", event.target.value)}
          className={`${inputClassName} min-h-[96px]`}
          placeholder="Ex. Sacs renforcés et pinces disponibles au point de rendez-vous..."
        />
      </FieldShell>

      <FieldShell
        label="Matériel à apporter par les bénévoles"
        hint="Suggestions à adapter au contexte : elles ne constituent pas une liste universelle obligatoire."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {ACTION_MATERIAL_SUGGESTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white/70 px-3 py-2 text-sm font-medium">
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
        <textarea
          value={form.recommendedMaterials}
          onChange={(event) => updateField("recommendedMaterials", event.target.value)}
          className={`${inputClassName} mt-3 min-h-[112px]`}
          placeholder="Précisions libres : eau, chaussures adaptées, protections complémentaires..."
        />
      </FieldShell>

      {(guidance.toPrepare.length > 0 || guidance.toAvoid.length > 0 || guidance.toReport.length > 0) ? (
        <div className="rounded-3xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm text-amber-950">
          <p className="font-bold">Référentiel CleanMyMap · indications dérivées des déchets attendus</p>
          {guidance.toPrepare.length > 0 ? <p className="mt-2">Protections suggérées : {guidance.toPrepare.join(" · ")}</p> : null}
          {[...guidance.toAvoid, ...guidance.toReport].length > 0 ? (
            <p className="mt-1">Vigilances et interdictions : {[...guidance.toAvoid, ...guidance.toReport].join(" · ")}</p>
          ) : null}
          <p className="mt-2 text-xs leading-5 text-amber-900/75">Ces recommandations restent séparées de vos consignes et ne sont pas enregistrées dans le texte organisateur.</p>
        </div>
      ) : null}
    </div>
  );
}
