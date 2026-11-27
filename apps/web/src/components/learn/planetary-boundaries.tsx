"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { PlanetaryRadarChart } from "./planetary-radar-chart";
import { PLANETARY_BOUNDARIES, PLANETARY_BOUNDARIES_REFERENCE } from "./planetary-boundaries-data";

export function PlanetaryBoundariesInteractive() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [selectedId, setSelectedId] = useState(PLANETARY_BOUNDARIES[0]?.id ?? "");
  const selected = PLANETARY_BOUNDARIES.find((boundary) => boundary.id === selectedId);
  if (!selected) return null;
  const crossed = PLANETARY_BOUNDARIES.filter((boundary) => boundary.status === "transgressed").length;
  const statusLabel = (status: "safe" | "transgressed") => status === "transgressed" ? (fr ? "Limite franchie" : "Boundary transgressed") : (fr ? "Non franchie à l'échelle mondiale" : "Not globally transgressed");
  return (
    <section aria-labelledby="planetary-boundaries-title" className="space-y-4">
      <div><h2 id="planetary-boundaries-title" className="text-2xl font-bold cmm-text-primary">{fr ? "Les 9 limites planétaires" : "The 9 planetary boundaries"}</h2><p className="cmm-text-body mt-1">{fr ? `Évaluation ${PLANETARY_BOUNDARIES_REFERENCE.year} : ${crossed} limites franchies. Une limite franchie signifie une hausse du risque, pas une catastrophe instantanée.` : `${PLANETARY_BOUNDARIES_REFERENCE.year} assessment: ${crossed} boundaries transgressed. Crossing a boundary signals increased risk, not an instantaneous catastrophe.`}</p></div>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <CmmCard tone="family" as="article" className="space-y-3">
          <PlanetaryRadarChart boundaries={PLANETARY_BOUNDARIES} selectedId={selected.id} onSelect={setSelectedId} locale={locale} />
          <p className="cmm-text-small text-center">{fr ? "Secteurs de même taille : couleur = statut, pas distance au seuil." : "Equal sectors: colour shows status, not distance to threshold."}</p>
          <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={fr ? "Sélectionner une limite" : "Select a boundary"}>
            {PLANETARY_BOUNDARIES.map((boundary) => <button key={boundary.id} type="button" aria-pressed={selected.id === boundary.id} onClick={() => setSelectedId(boundary.id)} className={`flex min-h-12 items-center gap-2 rounded-lg border p-2.5 text-left text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-white ${selected.id === boundary.id ? "border-amber-600 bg-amber-100 dark:bg-amber-950" : "border-amber-100 bg-white dark:bg-slate-900"}`}><span className={`h-3 w-3 shrink-0 rounded-full ${boundary.status === "transgressed" ? "bg-rose-700" : "bg-emerald-700"}`} aria-hidden="true" /><span>{fr ? boundary.name : boundary.nameEn}<span className="block text-xs font-normal">{statusLabel(boundary.status)}</span></span></button>)}
          </div>
        </CmmCard>
        <CmmCard as="article" className="space-y-4">
          <div className="flex items-center gap-3"><span className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl text-white ${selected.status === "transgressed" ? "bg-rose-700" : "bg-emerald-700"}`}><selected.icon size={28} aria-hidden="true" /></span><div><h3 className="text-xl font-bold cmm-text-primary">{fr ? selected.name : selected.nameEn}</h3><p className="cmm-text-body font-semibold">{statusLabel(selected.status)}</p></div></div>
          <p className="cmm-text-body">{selected.description[locale]}</p>
          <div className="rounded-xl bg-amber-50 p-4 text-slate-900 dark:bg-amber-950 dark:text-white"><h4 className="font-bold">{fr ? "Variable(s) de contrôle" : "Control variable(s)"}</h4><p className="mt-1 text-sm">{selected.controlVariable[locale]}</p></div>
          <div><h4 className="font-bold cmm-text-primary">{fr ? "Pressions et risques" : "Pressures and risks"}</h4><ul className="mt-1 list-disc space-y-1 pl-5 cmm-text-body">{selected.impacts.map((item) => <li key={item.fr}>{item[locale]}</li>)}</ul></div>
          <div><h4 className="font-bold cmm-text-primary">{fr ? "Leviers possibles" : "Possible responses"}</h4><ul className="mt-1 list-disc space-y-1 pl-5 cmm-text-body">{selected.solutions.map((item) => <li key={item.fr}>{item[locale]}</li>)}</ul></div>
          <div className="space-y-2 border-t border-slate-200 pt-3"><a href={PLANETARY_BOUNDARIES_REFERENCE.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 font-semibold text-amber-900 underline dark:text-amber-200">{PLANETARY_BOUNDARIES_REFERENCE.label}<ExternalLink className="h-4 w-4" aria-hidden="true" /></a><p className="cmm-text-small">{fr ? "Source vérifiée le" : "Source checked on"} {PLANETARY_BOUNDARIES_REFERENCE.checkedAt}. {fr ? "Pour les valeurs et seuils chiffrés, consulter l'évaluation scientifique." : "For numeric measurements and thresholds, consult the scientific assessment."}</p><a href={PLANETARY_BOUNDARIES_REFERENCE.frameworkUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold underline text-amber-900 dark:text-amber-200">{fr ? "Méthode et variables par limite" : "Framework and variables by boundary"}</a></div>
        </CmmCard>
      </div>
    </section>
  );
}
