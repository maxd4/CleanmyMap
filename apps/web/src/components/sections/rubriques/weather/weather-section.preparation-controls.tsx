"use client";

import {
  ACTION_MATERIAL_SUGGESTIONS,
  type ActionMaterialSuggestion,
  type ActionPreparationChecklistItem,
} from "@/lib/actions/preparation-contract";
import type { ActionPreparationContext } from "@/lib/actions/action-preparation-context";
import { CmmField, CmmTextarea } from "@/components/ui/cmm-field";

export type PreparationContextUpdate = Partial<Pick<
  ActionPreparationContext,
  "preparationChecklist" | "suggestedMaterials" | "materialsProvided" | "recommendedMaterials"
>>;

export function PreparationChecklist({
  items,
  fr,
  onChange,
  compact = false,
}: {
  items: ActionPreparationChecklistItem[];
  fr: boolean;
  onChange: (key: string, checked: boolean) => void;
  compact?: boolean;
}) {
  const complete = items.length > 0 && items.every((item) => item.checked);
  return (
    <section className={compact ? "space-y-3" : "rounded-2xl border border-emerald-200 bg-white/95 p-4 shadow-sm"} data-testid="preparation-checklist" aria-labelledby="preparation-checklist-title">
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 id="preparation-checklist-title" className="text-lg font-black text-slate-900">
            {fr ? "Checklist unique de préparation" : "Single preparation checklist"}
          </h3>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
            {complete ? (fr ? "Vérifié" : "Checked") : (fr ? "À revoir" : "To review")}
          </span>
        </div>
        <p className="cmm-text-body cmm-text-primary leading-6">
          {fr ? "À prévoir devient vérifié uniquement après une confirmation explicite. Une case ne certifie ni la sécurité, ni la présence sur le terrain, ni une validation administrative." : "Items become checked only after explicit confirmation. A checkbox is not a safety, attendance or administrative certification."}
        </p>
        <ul className="grid gap-2 sm:grid-cols-2" aria-label={fr ? "Checklist de préparation de l’action" : "Action preparation checklist"}>
          {items.map((item) => (
            <li key={item.key}>
              <label className="flex min-h-11 items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm font-semibold text-slate-800 focus-within:ring-2 focus-within:ring-emerald-500">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) => onChange(item.key, event.target.checked)}
                  className="h-4 w-4 shrink-0 accent-emerald-600"
                />
                <span>{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function PreparationMaterials({
  context,
  fr,
  onChange,
  compact = false,
}: {
  context?: ActionPreparationContext;
  fr: boolean;
  onChange: (update: PreparationContextUpdate) => void;
  compact?: boolean;
}) {
  const suggestedMaterials = context?.suggestedMaterials ?? [];
  const toggleSuggestion = (value: ActionMaterialSuggestion) => {
    onChange({
      suggestedMaterials: suggestedMaterials.includes(value)
        ? suggestedMaterials.filter((item) => item !== value)
        : [...suggestedMaterials, value],
    });
  };

  return (
    <section className={compact ? "space-y-3" : "rounded-2xl border border-emerald-200 bg-white/95 p-4 shadow-sm"}>
      <h3 className="text-base font-black text-slate-900">{fr ? "Matériel" : "Equipment"}</h3>
      <p className="mt-1 text-sm text-slate-600">{fr ? "Suggestions à adapter au contexte ; elles ne calculent ni quantité ni besoin universel." : "Suggestions to adapt to the context; they do not calculate quantities or universal needs."}</p>
      <fieldset className="mt-3 space-y-2">
        <legend className="text-sm font-semibold text-emerald-950">{fr ? "À prévoir" : "To bring"}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ACTION_MATERIAL_SUGGESTIONS.map((option) => (
            <label key={option.value} className="flex min-h-11 items-center gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm font-medium text-emerald-950 focus-within:ring-2 focus-within:ring-emerald-500">
              <input
                type="checkbox"
                checked={suggestedMaterials.includes(option.value)}
                onChange={() => toggleSuggestion(option.value)}
                className="h-4 w-4 rounded border-emerald-300 accent-emerald-600"
              />
              {fr ? option.label : option.value}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <CmmField id="preparation-materials-provided" label={fr ? "Matériel fourni" : "Equipment provided"} hint={fr ? "À distinguer de ce qui reste à apporter." : "Keep separate from items to bring."}>
          <CmmTextarea
            value={context?.materialsProvided ?? ""}
            onChange={(event) => onChange({ materialsProvided: event.target.value })}
            rows={2}
            maxLength={2000}
            placeholder={fr ? "Ex. pinces disponibles au rendez-vous" : "E.g. grabbers available at the meeting point"}
          />
        </CmmField>
        <CmmField id="preparation-materials-complement" label={fr ? "Complément à apporter (facultatif)" : "Additional items to bring (optional)"} hint={fr ? "Exemple libre, sans quantité calculée automatiquement." : "Free-form example; no quantity is calculated automatically."}>
          <CmmTextarea
            value={context?.recommendedMaterials ?? ""}
            onChange={(event) => onChange({ recommendedMaterials: event.target.value })}
            rows={2}
            maxLength={2000}
            placeholder={fr ? "Ex. eau, chaussures adaptées" : "E.g. water, suitable footwear"}
          />
        </CmmField>
      </div>
    </section>
  );
}
