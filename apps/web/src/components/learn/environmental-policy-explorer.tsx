"use client";

import { useMemo, useState } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { PresidentialEnvironmentalArchive } from "@/components/learn/presidential-environmental-archive";
import {
  filterEnvironmentalPolicies,
  formatPolicyDate,
  getEnvironmentalPolicyThemeOptions,
  getPolicyTimeline,
} from "@/lib/learning/policies/environmental-policy-filtering";
import type { EnvironmentalPolicyFilters, EnvironmentalPolicyRecord, PolicyLegalStatus, PolicyTerritoryScope } from "@/lib/learning/policies/environmental-policy-registry";
import type { PresidentialPublicArchive } from "@/lib/learning/policies/presidential-environmental-corpus";

const legalStatusLabels: Record<PolicyLegalStatus, { fr: string; en: string }> = {
  adopted: { fr: "Adoptée", en: "Adopted" },
  in_force: { fr: "En vigueur", en: "In force" },
  application_scheduled: { fr: "Application programmée", en: "Application scheduled" },
  transposition: { fr: "À transposer", en: "To be transposed" },
  implementation: { fr: "Mise en œuvre", en: "Implementation" },
};

const lifecycleStatusLabels = {
  current: { fr: "État actuel", en: "Current" },
  modified: { fr: "Modifiée", en: "Modified" },
  suspended: { fr: "Suspendue", en: "Suspended" },
  repealed: { fr: "Abrogée", en: "Repealed" },
  execution_undocumented: { fr: "Exécution non documentée", en: "Execution undocumented" },
} as const;

const implementationStatusLabels = {
  not_assessed: { fr: "Exécution non évaluée", en: "Execution not assessed" },
  partially_documented: { fr: "Exécution partiellement documentée", en: "Partially documented execution" },
  documented: { fr: "Exécution documentée", en: "Documented execution" },
  execution_undocumented: { fr: "Exécution non documentée", en: "Execution undocumented" },
} as const;

const scopeLabels: Record<PolicyTerritoryScope, { fr: string; en: string }> = {
  international: { fr: "International", en: "International" },
  national: { fr: "National", en: "National" },
  regional: { fr: "Région", en: "Region" },
  departmental: { fr: "Département", en: "Department" },
  communal: { fr: "Commune", en: "Municipality" },
};

const initialFilters: EnvironmentalPolicyFilters = { view: "world", query: "", territory: "all", theme: "all", year: "all", legalStatus: "all" };

type EnvironmentalPolicyExplorerProps = {
  publishedPolicies: EnvironmentalPolicyRecord[];
  presidentialArchive: PresidentialPublicArchive;
};

export function EnvironmentalPolicyExplorer({ publishedPolicies, presidentialArchive }: EnvironmentalPolicyExplorerProps) {
  const { locale } = useSitePreferences();
  const [filters, setFilters] = useState<EnvironmentalPolicyFilters>(initialFilters);
  const published = publishedPolicies;
  const visiblePublished = useMemo(() => published.filter((record) => (filters.view === "world" ? record.collection === "international" : record.collection === "france")), [filters.view, published]);
  const records = useMemo(() => filterEnvironmentalPolicies(published, filters), [filters, published]);
  const themes = getEnvironmentalPolicyThemeOptions(visiblePublished, locale);
  const years = Array.from(new Set(visiblePublished.flatMap((record) => getPolicyTimeline(record).map((milestone) => milestone.date.value?.slice(0, 4)).filter((year): year is string => Boolean(year))))).sort().reverse();
  const isFrench = locale === "fr";
  const text = (fr: string, en: string) => (isFrench ? fr : en);

  function updateFilters(patch: Partial<EnvironmentalPolicyFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  return (
    <>
    <section aria-labelledby="environmental-policies-title" className="space-y-5 rounded-[1.6rem] border border-amber-200 bg-white p-5 shadow-sm md:p-6" data-testid="environmental-policy-explorer">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">{text("Politiques environnementales", "Environmental policies")}</p>
          <h3 id="environmental-policies-title" className="text-2xl font-black tracking-tight text-slate-900">{text("Décisions publiques, sources et dates", "Public decisions, sources and dates")}</h3>
          <p className="cmm-text-body">{text("Une chronologie factuelle par jalon documenté, sans score ni classement politique. La couverture est initiale et non exhaustive ; elle ne constitue pas une actualité en direct.", "A factual chronology by documented milestone, with no political score or ranking. This initial coverage is non-exhaustive and is not live news.")}</p>
          <p className="text-xs text-slate-600">{text("Sources consultées le 13 novembre 2026 · les fiches non approuvées restent masquées.", "Sources consulted on 13 November 2026 · unapproved records remain hidden.")}</p>
        </div>
        <div className="flex rounded-full border border-amber-200 bg-amber-50 p-1" role="tablist" aria-label={text("Périmètre", "Scope")}>
          {["world", "france"].map((view) => (
            <button key={view} type="button" role="tab" aria-selected={filters.view === view} aria-controls="environmental-policy-results" className={`rounded-full px-4 py-2 text-sm font-black transition ${filters.view === view ? "bg-amber-500 text-white" : "text-amber-900 hover:bg-amber-100"}`} onClick={() => updateFilters({ view: view as EnvironmentalPolicyFilters["view"] })}>
              {view === "world" ? text("Monde", "World") : "France"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-1 text-sm font-bold text-slate-800 md:col-span-2 xl:col-span-1"><span>{text("Rechercher", "Search")}</span><input aria-label={text("Rechercher dans les fiches", "Search records")} value={filters.query} onChange={(event) => updateFilters({ query: event.target.value })} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 font-normal outline-none ring-amber-400 focus:ring-2" placeholder={text("Titre, institution, territoire…", "Title, institution, territory…")} /></label>
        <label className="space-y-1 text-sm font-bold text-slate-800"><span>{text("Territoire", "Territory")}</span><select aria-label={text("Filtrer par territoire", "Filter by territory")} value={filters.territory} onChange={(event) => updateFilters({ territory: event.target.value as EnvironmentalPolicyFilters["territory"] })} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 font-normal outline-none ring-amber-400 focus:ring-2"><option value="all">{text("Tous les niveaux", "All levels")}</option>{(Object.keys(scopeLabels) as PolicyTerritoryScope[]).map((scope) => <option key={scope} value={scope}>{scopeLabels[scope][locale]}</option>)}</select></label>
        <label className="space-y-1 text-sm font-bold text-slate-800"><span>{text("Thème", "Theme")}</span><select aria-label={text("Filtrer par thème", "Filter by theme")} value={filters.theme} onChange={(event) => updateFilters({ theme: event.target.value })} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 font-normal outline-none ring-amber-400 focus:ring-2"><option value="all">{text("Tous les thèmes", "All themes")}</option>{themes.map((theme) => <option key={theme.value} value={theme.value}>{theme.label}</option>)}</select></label>
        <label className="space-y-1 text-sm font-bold text-slate-800"><span>{text("Année du jalon", "Milestone year")}</span><select aria-label={text("Filtrer par année", "Filter by year")} value={filters.year} onChange={(event) => updateFilters({ year: event.target.value })} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 font-normal outline-none ring-amber-400 focus:ring-2"><option value="all">{text("Toutes les années", "All years")}</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
        <label className="space-y-1 text-sm font-bold text-slate-800"><span>{text("État juridique", "Legal status")}</span><select aria-label={text("Filtrer par état juridique", "Filter by legal status")} value={filters.legalStatus} onChange={(event) => updateFilters({ legalStatus: event.target.value as PolicyLegalStatus | "all" })} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 font-normal outline-none ring-amber-400 focus:ring-2"><option value="all">{text("Tous les états", "All statuses")}</option>{(Object.keys(legalStatusLabels) as PolicyLegalStatus[]).map((status) => <option key={status} value={status}>{legalStatusLabels[status][locale]}</option>)}</select></label>
      </div>

      <div id="environmental-policy-results">
        {records.length === 0 ? <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-6 text-center" role="status"><p className="font-black text-slate-900">{visiblePublished.length === 0 ? text("Aucune fiche publiée pour le moment.", "No published record yet.") : text("Aucune décision ne correspond à ces filtres.", "No decision matches these filters.")}</p><p className="mt-1 text-sm text-slate-600">{visiblePublished.length === 0 ? text("Les fiches documentaires restent masquées tant qu’une revue humaine effective n’a pas été enregistrée.", "Document records remain hidden until an effective human review has been recorded.") : text("Essayez une autre combinaison de filtres.", "Try another filter combination.")}</p></div> : <ol className="space-y-4" aria-label={text("Chronologie des décisions", "Decision timeline")}>{records.map((record) => <li key={record.id} className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4 md:p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div className="space-y-2"><div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide text-amber-800"><span>{record.territories.map((territory) => territory.label[locale]).join(" · ")}</span><span aria-hidden="true">·</span><span>{record.themes.map((theme) => theme[locale]).join(", ")}</span></div><h4 className="text-lg font-black text-slate-950">{record.title[locale]}</h4><p className="cmm-text-body">{record.measure[locale]}</p></div><div className="flex flex-wrap gap-2"><span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">{legalStatusLabels[record.legalStatus][locale]}</span><span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-amber-900">{lifecycleStatusLabels[record.lifecycleStatus][locale]}</span></div></div><dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">{getPolicyTimeline(record).map((milestone) => <div key={milestone.id}><dt className="font-black">{milestone.label[locale]}</dt><dd>{formatPolicyDate(milestone.date, locale)}</dd></div>)}<div><dt className="font-black">{text("Exécution", "Execution")}</dt><dd>{implementationStatusLabels[record.implementationStatus][locale]}</dd></div><div><dt className="font-black">{text("Institution", "Institution")}</dt><dd>{record.institution[locale]}</dd></div></dl><details className="mt-4 rounded-xl border border-amber-200 bg-white p-3"><summary className="cursor-pointer font-black text-amber-900">{text("Ouvrir la fiche détaillée", "Open detailed record")}</summary><p className="mt-3 cmm-text-body">{record.detail[locale]}</p><ul className="mt-3 space-y-2 text-sm text-slate-700">{record.limitations.map((limitation, index) => <li key={`${record.id}-limitation-${index}`}>{limitation[locale]}</li>)}</ul><p className="mt-3 text-xs text-slate-600">{text("Dernière vérification", "Last verification")}: {record.lastVerifiedAt ?? text("non précisée", "not specified")} · {text("Ancienne vérification", "Previous verification")}: {record.previousLastVerifiedAt ?? text("non précisée", "not specified")} · {text("consultation des sources", "source consultation")}: {record.lastConsultedAt ?? text("non précisée", "not specified")}</p><div className="mt-3 flex flex-wrap gap-2">{record.officialSources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">{source.name[locale]}</a>)}</div><div className="mt-4 border-t border-amber-100 pt-3"><p className="text-sm font-black text-slate-800">{text("Versions et sources liées", "Versions and linked sources")}</p><ul className="mt-2 space-y-2 text-sm text-slate-700">{record.versions.map((version) => <li key={version.id}><span className="font-black">{formatPolicyDate(version.recordedAt, locale)}</span> — {version.note[locale]} <span className="inline-flex flex-wrap gap-2">{version.sourceIds.map((sourceId) => { const linkedSource = record.officialSources.find((source) => source.id === sourceId); return linkedSource ? <a key={sourceId} href={linkedSource.url} target="_blank" rel="noreferrer" className="font-black text-amber-800 underline">{linkedSource.name[locale]}</a> : null; })}</span></li>)}</ul></div></details></li>)}</ol>}
      </div>
    </section>
    <PresidentialEnvironmentalArchive {...presidentialArchive} />
    </>
  );
}
