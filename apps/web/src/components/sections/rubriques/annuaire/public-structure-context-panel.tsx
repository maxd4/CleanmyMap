"use client";

import { getPublicStructureSource, type PublicStructureContext, type PublicStructureMetric } from "@/lib/partners/public-structure-context";

const COPY = {
  fr: { limits: "Limites", figures: "Chiffres et périmètres", basis: { documented: "Documenté", attributed_critique: "Critique publique attribuée", not_established: "Non établi" }, scope: { edition: "Bilan de l’édition", national: "France", ile_de_france: "Île-de-France", paris: "Paris", organization: "Structure entière", offer: "Offre annoncée" }, unit: { count: "", percent: "%", eur: "€", eur_per_kg: "€/kg", eur_per_person_year: "€/hab./an", kg: "kg", tonnes: "t" }, evidence: { organizer_report: "Bilan déclaré", organizer_statement: "Déclaration de l'organisateur", partner_statement: "Annonce d'un partenaire", operator_statement: "Déclaration de l'opérateur", public_authority: "Source publique", attributed_critique: "Position publique" }, verified: "source consultée le" },
  en: { limits: "Limitations", figures: "Figures and scope", basis: { documented: "Documented", attributed_critique: "Attributed public criticism", not_established: "Not established" }, scope: { edition: "Edition-wide results", national: "France", ile_de_france: "Île-de-France", paris: "Paris", organization: "Entire organization", offer: "Advertised offer" }, unit: { count: "", percent: "%", eur: "€", eur_per_kg: "€/kg", eur_per_person_year: "€/person/year", kg: "kg", tonnes: "t" }, evidence: { organizer_report: "Self-reported results", organizer_statement: "Organizer statement", partner_statement: "Partner announcement", operator_statement: "Operator statement", public_authority: "Public authority", attributed_critique: "Public position" }, verified: "source reviewed on" },
} as const;

function SourceLink({ id, fr }: { id: string; fr: boolean }) {
  const source = getPublicStructureSource(id);
  const text = fr ? COPY.fr : COPY.en;
  if (!source) return null;
  return <li className="break-words"><a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-sky-200 focus-visible:ring-2 focus-visible:ring-sky-300">{source.label}</a><span className="block text-slate-400">{text.evidence[source.evidence]} · {text.verified} {source.verifiedAt}</span></li>;
}

function Metric({ item, fr }: { item: PublicStructureMetric; fr: boolean }) {
  const lang = fr ? "fr" : "en";
  const text = COPY[lang];
  return <li className="border-b border-white/10 pb-2">
    <p className="font-semibold text-slate-200">{item.label[lang]} · {item.period} · {text.scope[item.scope]}</p>
    <p className="font-bold tabular-nums text-white">{item.quality === "approximate" ? "≈ " : ""}{item.value.toLocaleString(fr ? "fr-FR" : "en-US")}{text.unit[item.unit] ? " " + text.unit[item.unit] : ""}</p>
    <ul className="mt-1 text-xs"><SourceLink id={item.sourceId} fr={fr} /></ul>
  </li>;
}

/** One optional detail in the selected record, never a score, graph decoration or filter. */
export function PublicStructureContextPanel({ context, fr }: { context: PublicStructureContext | null; fr: boolean }) {
  if (!context) return null;
  const lang = fr ? "fr" : "en";
  const text = COPY[lang];
  return <section className="mt-4 space-y-3 text-sm text-slate-300">
    {context.metrics?.length ? <details className="rounded-xl border border-white/10 p-3">
      <summary className="cursor-pointer font-semibold text-white">{text.figures}</summary>
      <ul className="mt-3 space-y-2">{context.metrics.map(item => <Metric key={item.id} item={item} fr={fr} />)}</ul>
    </details> : null}
    {context.limits.length ? <details className="rounded-xl border border-amber-300/25 p-3">
      <summary className="cursor-pointer font-semibold text-white">{text.limits} ({context.limits.length})</summary>
      <ul className="mt-3 space-y-3">{context.limits.map(item => <li key={item.id} className="border-b border-white/10 pb-2">
        <p className="font-semibold text-amber-100">{text.basis[item.basis]}</p>
        <p className="mt-1 leading-relaxed">{item.text[lang]}</p>
        <ul className="mt-2 space-y-1 text-xs">{item.sourceIds.map(id => <SourceLink key={id} id={id} fr={fr} />)}</ul>
      </li>)}</ul>
    </details> : null}
  </section>;
}
