import type { BaseSectionProps } from "./section-contract";
import { CmmInput } from "@/components/ui/cmm-field";
import {
  characterLimitError,
  characterLimitHint,
  PREPARATION_FIELD_LIMITS,
} from "./preparation-field-utils";

function nextCustomKey(keys: readonly string[]): string {
  let candidate = keys.length + 1;
  while (keys.includes(`custom_${candidate}`)) candidate += 1;
  return `custom_${candidate}`;
}

export function PreparationChecklistFields({ form, updateField }: BaseSectionProps) {
  const updateChecklist = (index: number, update: Partial<(typeof form.preparationChecklist)[number]>) => {
    updateField(
      "preparationChecklist",
      form.preparationChecklist.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item),
    );
  };

  const addCustomItem = () => {
    if (form.preparationChecklist.length >= 12) return;
    updateField("preparationChecklist", [
      ...form.preparationChecklist,
      { key: nextCustomKey(form.preparationChecklist.map((item) => item.key)), label: "Nouvel élément", checked: false },
    ]);
  };

  const removeCustomItem = (index: number) => {
    if (!form.preparationChecklist[index]?.key.startsWith("custom_")) return;
    updateField("preparationChecklist", form.preparationChecklist.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-emerald-950">Checklist avant départ</legend>
      <p className="text-xs leading-5 text-emerald-900/70">Les cases sont un aide-mémoire organisateur. Elles ne certifient pas la sécurité, ne constituent pas une preuve terrain et ne génèrent pas d&apos;XP.</p>
      <div className="space-y-2">
        {form.preparationChecklist.map((item, index) => (
          <div key={item.key} className="flex min-h-11 items-center gap-2 rounded-xl border border-emerald-100 bg-white/70 px-3 py-2">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(event) => updateChecklist(index, { checked: event.target.checked })}
              className="h-4 w-4 shrink-0 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
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
            ) : (
              <span className="flex-1 text-sm font-medium text-emerald-950">{item.label}</span>
            )}
            {item.key.startsWith("custom_") ? (
              <button type="button" onClick={() => removeCustomItem(index)} className="text-xs font-semibold text-emerald-700 hover:text-rose-700">
                Retirer
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={addCustomItem}
          disabled={form.preparationChecklist.length >= 12}
          className="rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Ajouter un élément personnalisé
        </button>
      </div>

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
