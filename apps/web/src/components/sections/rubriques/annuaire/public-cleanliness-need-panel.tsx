"use client";

import { useState } from "react";
import type { PublicCleanlinessCityDataset } from "@/lib/partners/public-cleanliness-organization";
import { getPublicCleanlinessNeedRoute, getPublicCleanlinessNeedLabel, PUBLIC_CLEANLINESS_NEEDS, type PublicCleanlinessNeed } from "@/lib/partners/public-cleanliness-needs";
import { getArrondissementMunicipalLabel } from "@/lib/geo/paris-arrondissements";
import { getWasteCategory } from "@/lib/waste/catalog";

export function PublicCleanlinessNeedPanel({ dataset, fr, onSelect }: { dataset: PublicCleanlinessCityDataset; fr: boolean; onSelect: (id: string) => void }) {
  const [district, setDistrict] = useState("Paris:1");
  const [need, setNeed] = useState<PublicCleanlinessNeed>("organize");
  if (dataset.city !== "Paris") return null;
  const territory = dataset.territoryIds.includes(district) ? district : dataset.territoryIds[0];
  const route = territory ? getPublicCleanlinessNeedRoute(dataset, territory, need) : null;
  const lang = fr ? "fr" : "en";
  const copy = fr ? {
    title: "Qui contacter ?", district: "Arrondissement de l'opération", need: "Besoin de l'organisateur", intro: "Parcours public d'orientation. Aucun accord, financement, stock ou partenariat n'est acquis.",
    contacts: "Interlocuteurs et compétences", gaps: "À confirmer avant l'action", missing: "Information manquante", sources: "Sources du parcours", details: "Ouvrir la fiche", holders: "Responsables attestés", noHolder: "Titulaire opérationnel non établi", noContact: "Contact public direct non établi", unknownTerritory: "Desserte ou accès local non établi", waste: "Consignes Waste", historical: "Structure historique", unknown: "Affectation inconnue", confirmed: "Information documentée", portal: "Portail / orientation",
  } : {
    title: "Who should I contact?", district: "Event district", need: "Organizer's need", intro: "Public guidance only. No agreement, funding, stock or partnership is guaranteed.",
    contacts: "Contacts and responsibilities", gaps: "Confirm before the event", missing: "Missing information", sources: "Route sources", details: "Open record", holders: "Documented office holders", noHolder: "Operational contact not established", noContact: "Direct public contact not established", unknownTerritory: "Local coverage or access not established", waste: "Waste guidance", historical: "Historical structure", unknown: "Assignment unknown", confirmed: "Documented information", portal: "Portal / guidance",
  };
  return <section aria-labelledby="cleanliness-need-heading" className="mb-5 rounded-2xl border border-sky-300/20 bg-sky-300/[0.04] p-4">
    <h3 id="cleanliness-need-heading" className="font-black text-white">{copy.title}</h3>
    <p className="mt-2 text-sm text-slate-300">{copy.intro}</p>
    <div className="my-4 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-bold text-slate-300">{copy.district}<select value={territory ?? ""} onChange={event => setDistrict(event.target.value)} className="mt-1 block w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white">{dataset.territoryIds.map(id => <option key={id} value={id}>{fr ? getArrondissementMunicipalLabel("Paris", Number(id.split(":")[1])) : "Paris " + id.split(":")[1]}</option>)}</select></label>
      <label className="text-xs font-bold text-slate-300">{copy.need}<select value={need} onChange={event => setNeed(event.target.value as PublicCleanlinessNeed)} className="mt-1 block w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white">{PUBLIC_CLEANLINESS_NEEDS.map(id => <option key={id} value={id}>{getPublicCleanlinessNeedLabel(id)[lang]}</option>)}</select></label>
    </div>
    {route ? <div aria-live="polite" className="space-y-3">
      <p className="text-sm leading-6 text-slate-200">{route.guidance[lang]}</p>
      <h4 className="font-bold text-sm text-white">{copy.contacts}</h4>
      <ul className="grid gap-2 sm:grid-cols-2">{route.targets.map(target => <li key={target.id} className="min-w-0 rounded-xl border border-white/10 p-3 text-xs text-slate-300">
        <button type="button" onClick={() => onSelect(target.id)} className="text-left font-bold text-sky-200 underline underline-offset-2">{target.name}</button>
        <p className="mt-1">{target.rationale[lang]} · {copy[target.status]}</p>
        {!target.territoryKnown ? <p className="mt-1 text-amber-200">{copy.unknownTerritory}</p> : null}
        {target.contact ? <p className="mt-2 break-words"><a href={target.contact.url} target="_blank" rel="noreferrer" className="text-sky-200 underline">{target.contact.label}</a>{target.contact.kind === "official_portal" ? " · " + copy.portal : ""}</p> : <p className="mt-1">{copy.noContact}</p>}
        {target.holders.length ? <div className="mt-1">{copy.holders}: <ul>{target.holders.map(holder => <li key={holder.id}><button type="button" onClick={() => onSelect(holder.id)} className="text-sky-200 underline">{holder.name}</button></li>)}</ul></div> : <p className="mt-1">{copy.noHolder}</p>}
      </li>)}</ul>
      <div className="rounded-xl border border-amber-300/25 bg-amber-300/5 p-3 text-sm text-amber-100"><h4 className="font-bold">{copy.gaps}</h4><p className="mt-1">{route.gaps[lang]}</p>{route.missing.length ? <ul className="mt-2 list-disc pl-5">{route.missing.map((gap, i) => <li key={i}>{copy.missing}: {gap[lang]}</li>)}</ul> : null}</div>
      {route.wasteCategories.length ? <section className="text-xs text-slate-300"><h4 className="font-bold text-white">{copy.waste}</h4><ul className="mt-1 space-y-1">{route.wasteCategories.map(slug => { const waste = getWasteCategory(slug); return <li key={slug}><strong>{waste.labels[lang]}:</strong> {waste.fieldInstructions.map(item => item[lang]).join(" ")} {waste.prohibitions.map(item => item[lang]).join(" ")}</li>; })}</ul></section> : null}
      <details className="text-xs text-slate-300"><summary className="cursor-pointer font-semibold">{copy.sources}</summary><ul className="mt-2 space-y-1">{route.sources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer" className="text-sky-200 underline">{source.label}</a> · {source.verifiedAt}</li>)}</ul></details>
    </div> : <p role="status" className="text-sm text-amber-100">{copy.missing}</p>}
  </section>;
}
