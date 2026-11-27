"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { SUSTAINABLE_GOALS } from "@/data/content/sustainable-goals";
import { CmmCard } from "@/components/ui/cmm-card";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

export function SustainableGoalsInteractive() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = SUSTAINABLE_GOALS.find((goal) => goal.id === selectedId);
  return (
    <section aria-labelledby="sdg-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="sdg-title" className="text-2xl font-bold cmm-text-primary">{fr ? "Explorer les 17 ODD" : "Explore the 17 SDGs"}</h2><p className="cmm-text-body mt-1">{fr ? "Sélectionnez un objectif pour découvrir ses cibles, exemples d'indicateurs et liens pédagogiques." : "Select a goal to explore its targets, illustrative indicators and educational links (French content)."}</p></div><a href={fr ? "https://sdgs.un.org/fr/goals" : "https://sdgs.un.org/goals"} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 font-semibold text-amber-900 underline dark:text-amber-200">{fr ? "Référence ONU" : "UN reference"}<ExternalLink className="h-4 w-4" aria-hidden="true" /></a></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" role="group" aria-label={fr ? "Objectifs" : "Goals"}>
        {SUSTAINABLE_GOALS.map((goal) => (
          <button key={goal.id} type="button" aria-pressed={selectedId === goal.id} aria-controls="sdg-detail"
            onClick={() => setSelectedId(goal.id)}
            className={`relative flex min-h-32 flex-col items-start gap-2 overflow-hidden rounded-xl border bg-white p-3 text-left text-slate-900 dark:bg-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${selectedId === goal.id ? "border-amber-600 ring-2 ring-amber-300" : "border-slate-200 hover:border-amber-400 dark:border-slate-700"}`}>
            <span className={`absolute inset-x-0 top-0 h-2 ${goal.color}`} aria-hidden="true" />
            <div className="mt-2 flex w-full items-center justify-between gap-2"><goal.icon size={27} className="text-slate-800 dark:text-slate-100" /><span className="text-xl font-bold tabular-nums">{goal.number}</span></div>
            <span className="text-sm font-bold leading-snug" lang="fr">{goal.title}</span>
          </button>
        ))}
      </div>
      <div id="sdg-detail" aria-live="polite">
        {selected ? <CmmCard tone="family" as="article" className="space-y-4">
          <div className="flex items-start gap-3"><span className={`h-10 w-2 shrink-0 rounded ${selected.color}`} aria-hidden="true" /><div><p className="cmm-text-caption font-bold">{fr ? "Objectif" : "Goal"} {selected.number}</p><h3 className="text-xl font-bold cmm-text-primary" lang="fr">{selected.title}</h3></div></div>
          <p className="cmm-text-body" lang="fr">{selected.description}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-white p-4 text-slate-900 dark:bg-slate-900 dark:text-white"><h4 className="font-bold">{fr ? "Exemples de cibles" : "Illustrative targets"}</h4><ul className="mt-2 list-disc space-y-2 pl-5 text-sm" lang="fr">{selected.targets.map((target) => <li key={target}>{target}</li>)}</ul></div>
            <div className="rounded-xl bg-white p-4 text-slate-900 dark:bg-slate-900 dark:text-white"><h4 className="font-bold">{fr ? "Exemples d'indicateurs" : "Illustrative indicators"}</h4><ul className="mt-2 list-disc space-y-2 pl-5 text-sm" lang="fr">{selected.indicators.map((indicator) => <li key={indicator}>{indicator}</li>)}</ul></div>
          </div>
          <div className="rounded-xl border border-amber-200 p-4"><h4 className="font-bold cmm-text-primary">{fr ? "Lien pédagogique avec CleanMyMap" : "Educational link with CleanMyMap"}</h4><p className="cmm-text-body mt-1" lang="fr">{selected.cleanMapRelevance}</p><p className="cmm-text-small mt-2">{fr ? "Ce rapprochement ne démontre pas la contribution mesurée d'une action à cet objectif." : "This association does not establish a measured contribution of an action to this goal."}</p></div>
          <p className="cmm-text-small">{fr ? "Exemples de vulgarisation, non exhaustifs. Les définitions et séries statistiques à jour sont à vérifier auprès de l'ONU." : "Non-exhaustive educational examples. Consult the UN for current definitions and statistics."}</p>
        </CmmCard> : <CmmCard tone="family"><p className="cmm-text-body">{fr ? "Choisissez un objectif ci-dessus. Les 17 fiches restent disponibles sans compte." : "Choose a goal above. All 17 cards are available without an account."}</p></CmmCard>}
      </div>
    </section>
  );
}
