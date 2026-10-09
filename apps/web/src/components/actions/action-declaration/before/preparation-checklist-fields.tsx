import type { BaseSectionProps } from "./section-contract";
import { FieldShell } from "./ui";

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
    <FieldShell
      label="Checklist avant départ"
      hint="Les cases sont un aide-mémoire organisateur. Elles ne certifient pas la sécurité, ne constituent pas une preuve terrain et ne génèrent pas d'XP."
    >
      <div className="space-y-2 rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] p-3">
        {form.preparationChecklist.map((item, index) => (
          <div key={item.key} className="flex items-center gap-2 rounded-2xl bg-white/75 px-3 py-2">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(event) => updateChecklist(index, { checked: event.target.checked })}
              className="h-4 w-4 shrink-0 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
            />
            {item.key.startsWith("custom_") ? (
              <input
                value={item.label}
                onChange={(event) => updateChecklist(index, { label: event.target.value })}
                className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-emerald-950 outline-none"
                maxLength={120}
                aria-label={`Libellé de l'élément personnalisé ${index + 1}`}
              />
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
    </FieldShell>
  );
}
