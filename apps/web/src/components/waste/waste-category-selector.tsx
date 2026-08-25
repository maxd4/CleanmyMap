"use client";

import { useMemo, useState } from "react";
import { Search, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildWasteFieldGuidance,
  getWasteCategorySearchText,
  WASTE_FAMILY_LABELS,
  WASTE_FAMILY_ORDER,
  WASTE_DISPOSAL_LABELS,
  WASTE_HAZARD_LABELS,
  WASTE_PICKUP_LABELS,
} from "@/lib/waste/field-guidance";
import { WASTE_CATEGORY_SLUGS, getWasteCategory } from "@/lib/waste";
import type { WasteCategorySlug } from "@/lib/waste";

type WasteCategorySelectorProps = {
  value: readonly WasteCategorySlug[];
  onChange: (value: WasteCategorySlug[]) => void;
  fr?: boolean;
  disabled?: boolean;
  error?: string;
  idPrefix?: string;
  className?: string;
};

export function WasteCategorySelector({
  value,
  onChange,
  fr = true,
  disabled = false,
  error,
  idPrefix = "waste-category",
  className,
}: WasteCategorySelectorProps) {
  const [query, setQuery] = useState("");
  const selected = new Set(value);
  const normalizedQuery = query.trim().toLocaleLowerCase("fr-FR");
  const groups = useMemo(
    () => WASTE_FAMILY_ORDER.map((family) => ({
      family,
      categories: WASTE_CATEGORY_SLUGS
        .filter((slug) => getWasteCategory(slug).family === family)
        .filter((slug) => !normalizedQuery || getWasteCategorySearchText(slug).includes(normalizedQuery)),
    })).filter((group) => group.categories.length > 0),
    [normalizedQuery],
  );

  const toggle = (slug: WasteCategorySlug) => {
    if (disabled) return;
    onChange(selected.has(slug) ? value.filter((item) => item !== slug) : [...value, slug]);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black text-emerald-950">{fr ? "Catégories de déchets" : "Waste categories"}</p>
          <p className="text-xs font-medium text-emerald-900/65">
            {fr ? "Sélection multiple · recherche par famille ou exemple" : "Multi-select · search by family or example"}
          </p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
          {value.length} {fr ? "sélectionnée(s)" : "selected"}
        </span>
      </div>

      <label htmlFor={`${idPrefix}-search`} className="relative block">
        <span className="sr-only">{fr ? "Rechercher un déchet" : "Search waste"}</span>
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700/55" />
        <input
          id={`${idPrefix}-search`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={disabled}
          placeholder={fr ? "Rechercher…" : "Search…"}
          className="w-full rounded-2xl border border-emerald-200/70 bg-white px-11 py-3 text-sm font-medium text-emerald-950 outline-none transition placeholder:text-emerald-900/40 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
        />
      </label>

      <div className="space-y-4" aria-label={fr ? "Familles de déchets" : "Waste families"}>
        {groups.map(({ family, categories }) => (
          <fieldset key={family} className="space-y-2">
            <legend className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800/75">
              {WASTE_FAMILY_LABELS[family]}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {categories.map((slug) => {
                const category = getWasteCategory(slug);
                const isSelected = selected.has(slug);
                const isAlert = category.pickupPolicy === "no_pickup" || category.hazardLevel === "high" || category.hazardLevel === "critical";
                return (
                  <button
                    key={slug}
                    type="button"
                    id={`${idPrefix}-${slug}`}
                    disabled={disabled}
                    aria-pressed={isSelected}
                    onClick={() => toggle(slug)}
                    className={cn(
                      "flex min-h-12 items-start gap-3 rounded-2xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-55",
                      isSelected ? "border-emerald-500 bg-emerald-100 text-emerald-950 shadow-sm" : "border-emerald-100 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50",
                      isAlert && !isSelected && "border-amber-200 bg-amber-50/60",
                    )}
                  >
                    <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-black", isSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-300 bg-white text-transparent")}>✓</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-bold">
                        {category.labels.fr}
                        {isAlert ? <ShieldAlert size={14} className="shrink-0 text-amber-700" aria-label={fr ? "Vigilance" : "Caution"} /> : null}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium text-current/60">{category.examples[0]?.fr}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
        {groups.length === 0 ? <p className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-900">{fr ? "Aucune catégorie trouvée. Choisis « Autre » pour décrire un déchet non référencé." : "No category found. Choose Other for an unlisted waste."}</p> : null}
      </div>

      {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{error}</p> : null}

      {value.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/75 px-4 py-3 text-xs leading-5 text-amber-950">
          {buildWasteFieldGuidance(value).hasReportOnlyCategory
            ? (fr ? "Une catégorie nécessite un signalement ou une équipe autorisée : elle ne doit pas être traitée comme une collecte normale." : "A selected category requires reporting or an authorised team and is not normal collection.")
            : (fr ? "Les consignes détaillées s’affichent sous la sélection." : "Detailed guidance appears below the selection.")}
        </div>
      ) : null}
    </div>
  );
}

export function WasteFieldSummary({
  value,
  fr = true,
  className,
}: {
  value: readonly WasteCategorySlug[];
  fr?: boolean;
  className?: string;
}) {
  const guidance = buildWasteFieldGuidance(value);
  if (guidance.definitions.length === 0) return null;
  return (
    <div className={cn("space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black text-emerald-950">{fr ? "Synthèse terrain" : "Field summary"}</p>
        {guidance.hasReportOnlyCategory ? <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rose-800">{fr ? "Signalement requis" : "Report required"}</span> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <GuidanceList title="À prévoir" items={guidance.toPrepare} tone="emerald" />
        <GuidanceList title="À éviter" items={guidance.toAvoid} tone="amber" />
        <GuidanceList title="À signaler" items={guidance.toReport} tone="rose" emptyLabel="Aucun risque spécifique" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {guidance.definitions.map((category) => (
          <div key={category.slug} className={cn("rounded-xl border bg-white/80 px-3 py-2 text-xs", category.pickupPolicy === "no_pickup" ? "border-rose-200 text-rose-900" : "border-emerald-100 text-slate-700")}>
            <p className="font-bold">{category.labels.fr}</p>
            <p className="mt-1 font-medium">{WASTE_HAZARD_LABELS[category.hazardLevel]} · {WASTE_PICKUP_LABELS[category.pickupPolicy]}</p>
            <p className="mt-1 font-medium">{category.fieldInstructions[0]?.fr} · {WASTE_DISPOSAL_LABELS[category.disposalRoute]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GuidanceList({ title, items, tone, emptyLabel = "" }: { title: string; items: string[]; tone: "emerald" | "amber" | "rose"; emptyLabel?: string }) {
  const toneClass = tone === "rose" ? "text-rose-900" : tone === "amber" ? "text-amber-950" : "text-emerald-950";
  return (
    <div className={cn("rounded-xl border bg-white/70 p-3", tone === "rose" ? "border-rose-200" : tone === "amber" ? "border-amber-200" : "border-emerald-100")}>
      <p className={cn("text-[10px] font-black uppercase tracking-[0.14em]", toneClass)}>{title}</p>
      <ul className={cn("mt-2 space-y-1 text-xs font-medium leading-5", toneClass)}>
        {(items.length > 0 ? items : [emptyLabel]).map((item) => <li key={item}>• {item}</li>)}
      </ul>
    </div>
  );
}
