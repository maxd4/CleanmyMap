"use client";

import { ChevronDown, ExternalLink, FileText } from "lucide-react";
import { GIEC_REPORTS } from "@/data/content/giec-reports";
import { CmmCard } from "@/components/ui/cmm-card";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

export function GIECContent() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  return (
    <section aria-labelledby="giec-reports-title" className="space-y-4">
      <div className="flex items-center gap-3">
        <FileText className="h-7 w-7 text-amber-800 dark:text-amber-300" aria-hidden="true" />
        <div><h2 id="giec-reports-title" className="text-2xl font-bold cmm-text-primary">{fr ? "Rapports du GIEC" : "IPCC reports"}</h2><p className="cmm-text-body">{fr ? "Sixième cycle, synthèses datées de 2021 à 2023. Ouvrez une fiche pour lire les résultats et leur source." : "Sixth assessment cycle, 2021 to 2023. Open a card for the findings (French) and the original English source."}</p></div>
      </div>
      <div className="grid items-start gap-3 lg:grid-cols-2">
        {GIEC_REPORTS.map((report) => (
          <CmmCard key={report.id} tone="family" as="article" className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div><p className="cmm-text-caption font-bold text-amber-800 dark:text-amber-300">AR6 · {report.year}</p><h3 className="mt-1 text-xl font-bold cmm-text-primary" lang="fr">{report.title}</h3></div>
              <span className="text-2xl font-bold tabular-nums text-amber-800 dark:text-amber-300">{report.year}</span>
            </div>
            <p className="cmm-text-body" lang="fr">{report.focus}</p>
            <ul className="grid gap-2 sm:grid-cols-3" lang="fr">
              {report.keyFindings.map((finding) => <li key={finding.title} className="flex min-w-0 flex-col gap-2 rounded-xl bg-white p-3 text-slate-900 dark:bg-slate-900 dark:text-white"><finding.icon size={22} className="text-amber-800 dark:text-amber-300" /><span className="text-sm font-semibold">{finding.title}</span></li>)}
            </ul>
            <details className="group rounded-xl border border-amber-200 bg-white p-3 dark:bg-slate-900">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-bold cmm-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">{fr ? "Résultats, limites et leviers" : "Findings, limitations and options (FR)"}<ChevronDown className="h-5 w-5 shrink-0 group-open:rotate-180" aria-hidden="true" /></summary>
              <div className="space-y-4 border-t border-amber-100 pt-3" lang="fr">
                <dl className="space-y-3">{report.keyFindings.map((finding) => <div key={finding.title}><dt className="font-bold cmm-text-primary">{finding.title}</dt><dd className="cmm-text-body mt-1">{finding.description}</dd></div>)}</dl>
                <div><h4 className="font-bold cmm-text-primary">Interprétation</h4><ul className="mt-1 list-disc space-y-1 pl-5 cmm-text-body">{report.implications.map((item) => <li key={item}>{item}</li>)}</ul></div>
                <div><h4 className="font-bold cmm-text-primary">Leviers étudiés</h4><ul className="mt-1 list-disc space-y-1 pl-5 cmm-text-body">{report.solutions.map((item) => <li key={item}>{item}</li>)}</ul></div>
              </div>
            </details>
            <a href={report.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 font-semibold text-amber-900 underline underline-offset-4 dark:text-amber-200">{fr ? "Résumé officiel pour les décideurs" : "Official summary for policymakers"}<ExternalLink className="h-4 w-4" aria-hidden="true" /></a>
          </CmmCard>
        ))}
      </div>
      <p className="cmm-text-small">{fr ? "Les chiffres sont des résultats des rapports cités, pas des valeurs actualisées en temps réel. Les fiches ne constituent pas le rapport intégral." : "Figures are from the cited assessments, not live measurements. These cards are not the full reports."}</p>
    </section>
  );
}
