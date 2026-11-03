"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACTION_MEASUREMENT_MAX_KG,
  ACTION_WASTE_CHARACTERIZATION_CATEGORIES,
  ACTION_WASTE_CHARACTERIZATION_SLUGS,
  compareWasteCharacterizationToTotal,
  getActionWasteCharacterizationCategory,
  isActionWasteCharacterizationSlug,
  sumActionWasteCharacterizationKg,
  type ActionWasteCharacterizationSlug,
} from "@/lib/waste";

export type WasteCharacterizationFormValues = Partial<
  Record<ActionWasteCharacterizationSlug, string>
>;

type WasteCharacterizationSelectorProps = {
  characterizationKg: WasteCharacterizationFormValues;
  totalWasteKg: number | null;
  onCharacterizationChange: (value: WasteCharacterizationFormValues) => void;
  error?: string;
  idPrefix?: string;
};

const inputClass = "h-10 w-28 rounded-lg border border-slate-200 bg-white px-2.5 text-right text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15";

function parseFormKg(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function isKnownCharacterizationSlug(value: string): value is ActionWasteCharacterizationSlug {
  return isActionWasteCharacterizationSlug(value);
}

export function WasteCharacterizationSelector({
  characterizationKg,
  totalWasteKg,
  onCharacterizationChange,
  error,
  idPrefix = "harvest-waste-characterization",
}: WasteCharacterizationSelectorProps) {
  const selected = new Set(
    Object.keys(characterizationKg).filter(isKnownCharacterizationSlug),
  );
  const [open, setOpen] = useState(() => selected.size > 0 || Object.keys(characterizationKg).length > 0);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("fr-FR");

  const visibleCategories = useMemo(
    () => ACTION_WASTE_CHARACTERIZATION_CATEGORIES.filter((category) => {
      if (!normalizedQuery) return true;
      return `${category.label} ${category.examples}`
        .toLocaleLowerCase("fr-FR")
        .includes(normalizedQuery);
    }),
    [normalizedQuery],
  );

  const parsedCharacterization = Object.fromEntries(
    ACTION_WASTE_CHARACTERIZATION_SLUGS.flatMap((slug) => {
      const value = parseFormKg(characterizationKg[slug]);
      return value === null ? [] : [[slug, value]];
    }),
  );
  const characterizedTotalKg = sumActionWasteCharacterizationKg(parsedCharacterization);
  const coherence = compareWasteCharacterizationToTotal(totalWasteKg, parsedCharacterization);

  function toggleCategory(slug: ActionWasteCharacterizationSlug) {
    const isSelected = selected.has(slug);
    if (isSelected) {
      const currentValue = characterizationKg[slug]?.trim() ?? "";
      if (currentValue && typeof window !== "undefined" && !window.confirm(`Supprimer la masse caractérisée pour « ${getActionWasteCharacterizationCategory(slug).labels.fr} » ?`)) {
        return;
      }
      const next = { ...characterizationKg };
      delete next[slug];
      onCharacterizationChange(next);
      return;
    }

    onCharacterizationChange({ ...characterizationKg, [slug]: "" });
  }

  function updateMass(slug: ActionWasteCharacterizationSlug, value: string) {
    onCharacterizationChange({ ...characterizationKg, [slug]: value });
  }

  return (
    <div className="border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`${idPrefix}-toggle`} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            id={`${idPrefix}-toggle`}
            type="checkbox"
            checked={open}
            onChange={(event) => setOpen(event.target.checked)}
            className="h-4 w-4 accent-emerald-600"
            aria-controls={`${idPrefix}-panel`}
          />
          Caractériser les déchets (facultatif)
        </label>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Replier la caractérisation des déchets" : "Déplier la caractérisation des déchets"}
          aria-expanded={open}
          aria-controls={`${idPrefix}-panel`}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open ? (
        <div id={`${idPrefix}-panel`} className="mt-3 space-y-3" aria-live="polite">
          <label htmlFor={`${idPrefix}-search`} className="relative block">
            <span className="sr-only">Rechercher une catégorie</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id={`${idPrefix}-search`}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une catégorie"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
            />
          </label>

          <div className="space-y-2" aria-label="Catégories de déchets caractérisables">
            {visibleCategories.map((category) => {
              const isSelected = selected.has(category.slug);
              const mass = characterizationKg[category.slug] ?? "";
              const definition = getActionWasteCharacterizationCategory(category.slug);
              return (
                <div key={category.slug} className={cn("rounded-xl border px-3 py-2.5", isSelected ? "border-emerald-300 bg-emerald-50/70" : "border-slate-200 bg-white")}>
                  <div className="flex items-center gap-2.5">
                    <input
                      id={`${idPrefix}-${category.slug}`}
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCategory(category.slug)}
                      className="h-4 w-4 shrink-0 accent-emerald-600"
                    />
                    <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-base text-slate-800">{category.icon}</span>
                    <label htmlFor={`${idPrefix}-${category.slug}`} className="min-w-0 flex-1 cursor-pointer">
                      <span className="block text-sm font-semibold text-slate-800">{category.label}</span>
                      <span className="block text-xs text-slate-500">{category.examples}</span>
                    </label>
                    {isSelected ? (
                      <label className="flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-600">
                        <span className="sr-only">Masse de {category.label}</span>
                        <input
                          id={`${idPrefix}-${category.slug}-kg`}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max={ACTION_MEASUREMENT_MAX_KG}
                          step="0.1"
                          value={mass}
                          onChange={(event) => updateMass(category.slug, event.target.value)}
                          className={cn(inputClass, error && "border-rose-400")}
                          aria-label={`Masse de ${category.label} en kg`}
                          aria-invalid={Boolean(error)}
                        />
                        <span>kg</span>
                      </label>
                    ) : null}
                  </div>
                  {isSelected && (category.safetyNote || definition.pickupPolicy === "no_pickup") ? (
                    <p className="mt-2 flex items-start gap-1.5 pl-7 text-xs font-medium text-amber-800">
                      <ShieldAlert size={13} className="mt-0.5 shrink-0" />
                      {category.safetyNote ?? "Consigne de sécurité à vérifier avant collecte."}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{error}</p> : null}
          {coherence.status === "warning" ? (
            <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              La caractérisation dépasse la masse totale ({coherence.excessKg?.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kg).
            </p>
          ) : null}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{characterizedTotalKg === null ? "Aucune masse renseignée" : `${characterizedTotalKg.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg caractérisés`}</span>
            <span>{selected.size} sélectionnée{selected.size > 1 ? "s" : ""}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
