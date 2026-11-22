import type { BaseSectionProps } from "./section-contract";
import { CmmInput } from "@/components/ui/cmm-field";
import {
  characterLimitError,
  characterLimitHint,
  PREPARATION_FIELD_LIMITS,
} from "./preparation-field-utils";
import {
  addSuggestedPreparationItem,
  contextualPreparationSuggestions,
  preparationChecklistSummary,
  preparationMomentContext,
  preparationMomentForItem,
  PREPARATION_MOMENTS,
} from "./preparation-checklist-model";

function nextCustomKey(keys: readonly string[], moment: (typeof PREPARATION_MOMENTS)[number]["id"]): string {
  let candidate = keys.length + 1;
  while (keys.includes(`custom_${moment}_${candidate}`)) candidate += 1;
  return `custom_${moment}_${candidate}`;
}

export function PreparationChecklistFields({ form, updateField }: BaseSectionProps) {
  const summary = preparationChecklistSummary(form);
  const momentContext = preparationMomentContext(form);
  const suggestions = contextualPreparationSuggestions(form);
  const updateChecklist = (index: number, update: Partial<(typeof form.preparationChecklist)[number]>) => {
    updateField(
      "preparationChecklist",
      form.preparationChecklist.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item),
    );
  };

  const addCustomItem = (moment: (typeof PREPARATION_MOMENTS)[number]["id"]) => {
    if (form.preparationChecklist.length >= 12) return;
    updateField("preparationChecklist", [
      ...form.preparationChecklist,
      { key: nextCustomKey(form.preparationChecklist.map((item) => item.key), moment), label: "Nouvel élément", checked: false },
    ]);
  };

  const addSuggestion = (suggestion: (typeof suggestions)[number]) => {
    updateField("preparationChecklist", addSuggestedPreparationItem(form.preparationChecklist, suggestion));
  };

  const removeCustomItem = (index: number) => {
    if (!form.preparationChecklist[index]?.key.startsWith("custom_")) return;
    updateField("preparationChecklist", form.preparationChecklist.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-emerald-950">Déroulement opérationnel</legend>
      <p className="text-xs leading-5 text-emerald-900/75">Les suggestions restent à confirmer. Les horaires proviennent des champs canoniques du rendez-vous et du départ.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <p className="rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-emerald-950">Confirmés : {summary.confirmed}</p>
        <p className="rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-amber-950">À confirmer : {summary.unconfirmed}</p>
        <p className="rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-slate-800">Informations manquantes : {summary.missingInformation.length}</p>
      </div>
      {summary.missingInformation.length > 0 ? (
        <p className="text-xs text-slate-700">À renseigner : {summary.missingInformation.join(" · ")}</p>
      ) : null}
      <div className="space-y-3">
        {PREPARATION_MOMENTS.map((moment) => {
          const items = form.preparationChecklist
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => preparationMomentForItem(item.key) === moment.id);
          return (
            <section key={moment.id} aria-labelledby={`before-checklist-${moment.id}`} className="rounded-xl border border-emerald-100 bg-white/40 p-3">
              <h4 id={`before-checklist-${moment.id}`} className="font-bold text-emerald-950">{moment.label}</h4>
              <p className="text-xs text-emerald-900/70">{moment.description}</p>
              {momentContext[moment.id].length > 0 ? <ul className="mt-1 space-y-1 text-xs leading-5 text-emerald-950">{momentContext[moment.id].map((line) => <li key={line}>{line}</li>)}</ul> : null}
              <div className="mt-2 space-y-2">
                {items.map(({ item, index }) => (
                  <div key={item.key} className="flex min-h-11 items-center gap-2 rounded-lg border border-emerald-100 bg-white/80 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(event) => updateChecklist(index, { checked: event.target.checked })}
                      className="h-4 w-4 shrink-0 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                      aria-label={`${item.checked ? "Contrôle confirmé" : "Confirmer"} : ${item.label}`}
                    />
                    {item.key.startsWith("custom_") ? (
                      <div className="min-w-0 flex-1">
                        <CmmInput
                          id={`before-checklist-item-${item.key}`}
                          value={item.label}
                          onChange={(event) => updateChecklist(index, { label: event.target.value })}
                          maxLength={PREPARATION_FIELD_LIMITS.customChecklistLabel}
                          aria-describedby={`before-checklist-item-${item.key}-hint`}
                          aria-invalid={Boolean(characterLimitError(item.label, "Le libellé", PREPARATION_FIELD_LIMITS.customChecklistLabel))}
                          aria-label={`Libellé de l'élément personnalisé ${index + 1}`}
                        />
                        <span id={`before-checklist-item-${item.key}-hint`} className="mt-1 block text-xs font-normal text-emerald-900/65">
                          {characterLimitHint(item.label, PREPARATION_FIELD_LIMITS.customChecklistLabel)}
                        </span>
                      </div>
                    ) : <span className="flex-1 text-sm font-medium text-emerald-950">{item.label}</span>}
                    {item.key.startsWith("custom_") ? (
                      <button type="button" onClick={() => removeCustomItem(index)} className="min-h-11 px-2 text-xs font-semibold text-emerald-700 hover:text-rose-700">
                        Retirer
                      </button>
                    ) : null}
                  </div>
                ))}
                {items.length === 0 ? <p className="text-xs text-slate-600">Aucun contrôle confirmé à ce moment.</p> : null}
                <button type="button" onClick={() => addCustomItem(moment.id)} disabled={form.preparationChecklist.length >= 12} className="min-h-11 rounded-full border border-emerald-300 bg-white px-3 text-xs font-bold text-emerald-800 disabled:opacity-50">Ajouter un contrôle à {moment.label.toLocaleLowerCase("fr-FR")}</button>
              </div>
            </section>
          );
        })}
        {form.preparationChecklist.some((item) => preparationMomentForItem(item.key) === "unassigned") ? (
          <section aria-labelledby="before-checklist-unassigned" className="rounded-xl border border-slate-200 bg-white/40 p-3">
            <h4 id="before-checklist-unassigned" className="font-bold text-slate-800">Éléments historiques à classer</h4>
            <div className="mt-2 space-y-2">
              {form.preparationChecklist.map((item, index) => ({ item, index }))
                .filter(({ item }) => preparationMomentForItem(item.key) === "unassigned")
                .map(({ item, index }) => (
                  <div key={item.key} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <input type="checkbox" checked={item.checked} onChange={(event) => updateChecklist(index, { checked: event.target.checked })} aria-label={`Confirmer : ${item.label}`} className="h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      {item.key.startsWith("custom_") ? (
                        <div>
                          <CmmInput id={`before-checklist-item-${item.key}`} value={item.label} onChange={(event) => updateChecklist(index, { label: event.target.value })} maxLength={PREPARATION_FIELD_LIMITS.customChecklistLabel} aria-label={`Libellé de l'élément personnalisé ${index + 1}`} />
                          <span className="mt-1 block text-xs text-emerald-900/65">{characterLimitHint(item.label, PREPARATION_FIELD_LIMITS.customChecklistLabel)}</span>
                        </div>
                      ) : <span className="text-sm">{item.label}</span>}
                    </div>
                    {item.key.startsWith("custom_") ? <button type="button" onClick={() => removeCustomItem(index)} className="min-h-11 px-2 text-xs font-semibold text-emerald-700 hover:text-rose-700">Retirer</button> : null}
                  </div>
                ))}
            </div>
          </section>
        ) : null}
      </div>
      <section aria-labelledby="before-checklist-suggestions" className="rounded-xl border border-dashed border-emerald-300 bg-white/50 p-3">
        <h4 id="before-checklist-suggestions" className="font-bold text-emerald-950">Suggestions selon le mode d’intervention</h4>
        <p className="text-xs text-emerald-900/75">Ajouter une suggestion la crée comme contrôle non confirmé.</p>
        {suggestions.length > 0 ? (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                <span>{suggestion.label} <span className="text-xs text-slate-600">· {PREPARATION_MOMENTS.find(({ id }) => id === suggestion.moment)?.label}</span></span>
                <button type="button" onClick={() => addSuggestion(suggestion)} disabled={form.preparationChecklist.length >= 12} className="min-h-11 rounded-full border border-emerald-300 px-3 text-xs font-bold text-emerald-800 disabled:opacity-50">Ajouter</button>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-xs text-slate-600">Toutes les suggestions proposées figurent déjà dans le suivi.</p>}
      </section>

      {form.checklistBeforeDeparture.trim() ? (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
          <p className="font-bold">Note de checklist historique conservée</p>
          <p className="mt-1 whitespace-pre-line">{form.checklistBeforeDeparture}</p>
        </div>
      ) : null}
      {form.preparationChecklist.some((item) => item.key.startsWith("custom_") && characterLimitError(item.label, "Le libellé", PREPARATION_FIELD_LIMITS.customChecklistLabel)) ? (
        <p className="text-xs font-medium text-rose-700" role="alert">Un libellé personnalisé dépasse la limite de {PREPARATION_FIELD_LIMITS.customChecklistLabel} caractères.</p>
      ) : null}
    </fieldset>
  );
}
