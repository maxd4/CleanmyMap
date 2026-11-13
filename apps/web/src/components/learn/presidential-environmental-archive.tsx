"use client";

import { useMemo, useState } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { formatPolicyDate } from "@/lib/learning/policies/environmental-policy-filtering";
import { filterPresidentialCommitments, sortPresidentialCommitments } from "@/lib/learning/policies/presidential-environmental-filtering";
import type { PresidentialCommitmentDocumentationStatus, PresidentialComparisonView, PresidentialPublicArchive, PresidentialSourceType } from "@/lib/learning/policies/presidential-environmental-corpus";

type ArchiveYear = 2012 | 2017 | 2022 | 2027;

const sourceTypeLabels: Record<PresidentialSourceType, { fr: string; en: string }> = {
  SOURCE_PRIMAIRE_OFFICIELLE: { fr: "Source primaire officielle", en: "Official primary source" },
  SOURCE_PRIMAIRE_ARCHIVEE: { fr: "Source primaire archivée", en: "Archived primary source" },
  PRIMARY_ARCHIVED: { fr: "Source primaire archivée", en: "Archived primary source" },
  PRIMARY_PARTY_PROGRAM: { fr: "Programme de parti", en: "Party programme" },
  DISCOURS_OFFICIEL: { fr: "Discours officiel", en: "Official speech" },
  SOURCE_SECONDAIRE: { fr: "Source secondaire", en: "Secondary source" },
  EN_ATTENTE_DE_PREUVE: { fr: "Preuve à retrouver", en: "Evidence to be found" },
};

const archiveYears: ArchiveYear[] = [2012, 2017, 2022, 2027];

const documentationStatusLabels: Record<PresidentialCommitmentDocumentationStatus, { fr: string; en: string }> = {
  not_collected: { fr: "Non collecté", en: "Not collected" },
  no_measure_identified_after_review: { fr: "Revue sans mesure identifiée", en: "Reviewed, no measure identified" },
  not_quantified: { fr: "Non quantifié", en: "Not quantified" },
  deadline_unspecified: { fr: "Échéance non précisée", en: "Deadline unspecified" },
  source_insufficient: { fr: "Source insuffisante", en: "Insufficient source" },
  draft: { fr: "Brouillon", en: "Draft" },
  validated: { fr: "Validé", en: "Validated" },
};

const comparisonViewLabels: Record<PresidentialComparisonView, { fr: string; en: string }> = {
  theme: { fr: "Par thème", en: "By theme" },
  candidate: { fr: "Par candidature", en: "By candidate" },
};

const followUpStatusLabels = {
  realized: { fr: "Réalisé", en: "Realized" },
  in_progress: { fr: "En cours", en: "In progress" },
  modified: { fr: "Modifié", en: "Modified" },
  abandoned: { fr: "Abandonné", en: "Abandoned" },
  not_documented: { fr: "Suivi non documenté", en: "Follow-up not documented" },
} as const;

export function PresidentialEnvironmentalArchive({ elections, candidates, validatedCommitments }: PresidentialPublicArchive) {
  const { locale } = useSitePreferences();
  const [year, setYear] = useState<ArchiveYear>(2012);
  const [theme, setTheme] = useState("all");
  const [candidateId, setCandidateId] = useState("all");
  const [documentationStatus, setDocumentationStatus] = useState<PresidentialCommitmentDocumentationStatus | "all">("all");
  const [comparisonView, setComparisonView] = useState<PresidentialComparisonView>("theme");
  const isFrench = locale === "fr";
  const text = (fr: string, en: string) => (isFrench ? fr : en);
  const election = elections.find((electionRecord) => electionRecord.year === year);
  const yearCandidates = candidates.filter((candidateRecord) => candidateRecord.electionYear === year);
  const visibleCommitments = useMemo(() => sortPresidentialCommitments(filterPresidentialCommitments(validatedCommitments, { year, theme, candidateId: candidateId === "all" ? undefined : candidateId, documentationStatus, locale }), comparisonView, locale), [candidateId, comparisonView, documentationStatus, locale, theme, year, validatedCommitments]);
  const validatedThemes = useMemo(() => Array.from(new Set(validatedCommitments.filter((commitment) => commitment.electionYear === year).map((commitment) => commitment.theme[locale]))).sort(), [locale, validatedCommitments, year]);
  const source = election?.candidateListSource;

  return (
    <section aria-labelledby="presidential-environmental-archive-title" className="space-y-5 rounded-[1.6rem] border border-amber-200 bg-white p-5 shadow-sm md:p-6" data-testid="presidential-environmental-archive">
      <div className="max-w-3xl space-y-2">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">{text("Archives présidentielles", "Presidential archives")}</p>
        <h3 id="presidential-environmental-archive-title" className="text-2xl font-black tracking-tight text-slate-900">{text("Candidatures et engagements environnementaux", "Environmental candidacies and commitments")}</h3>
        <p className="cmm-text-body">{text("Le millésime du scrutin est séparé de la date de chaque document. Cette archive présente les candidatures officielles et les mesures seulement après revue humaine ; elle ne donne ni opinion ni classement.", "The election year is kept separate from each document date. This archive shows official candidacies and measures only after human review; it provides no opinion or ranking.")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label={text("Année du scrutin", "Election year")}>
        {archiveYears.map((archiveYear) => (
          <button key={archiveYear} type="button" role="tab" aria-selected={year === archiveYear} aria-controls="presidential-environmental-archive-results" className={`rounded-full px-4 py-2 text-sm font-black transition ${year === archiveYear ? "bg-amber-500 text-white" : "text-amber-900 hover:bg-amber-100"}`} onClick={() => { setYear(archiveYear); setTheme("all"); setCandidateId("all"); setDocumentationStatus("all"); }}>
            {archiveYear}
          </button>
        ))}
      </div>

      <div className="grid gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 text-sm font-bold text-slate-800"><span>{text("Thème des engagements validés", "Validated commitment theme")}</span><select aria-label={text("Filtrer les engagements par thème", "Filter commitments by theme")} value={theme} onChange={(event) => setTheme(event.target.value)} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 font-normal outline-none ring-amber-400 focus:ring-2"><option value="all">{text("Tous les thèmes validés", "All validated themes")}</option>{validatedThemes.map((validatedTheme) => <option key={validatedTheme} value={validatedTheme}>{validatedTheme}</option>)}</select></label>
        <label className="space-y-1 text-sm font-bold text-slate-800"><span>{text("Candidat (vue secondaire)", "Candidate (secondary view)")}</span><select aria-label={text("Filtrer les engagements par candidat", "Filter commitments by candidate")} value={candidateId} onChange={(event) => setCandidateId(event.target.value)} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 font-normal outline-none ring-amber-400 focus:ring-2"><option value="all">{text("Tous les candidats", "All candidates")}</option>{yearCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name[locale]}</option>)}</select></label>
        <label className="space-y-1 text-sm font-bold text-slate-800"><span>{text("Niveau de documentation", "Documentation level")}</span><select aria-label={text("Filtrer par niveau de documentation", "Filter by documentation level")} value={documentationStatus} onChange={(event) => setDocumentationStatus(event.target.value as PresidentialCommitmentDocumentationStatus | "all")} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 font-normal outline-none ring-amber-400 focus:ring-2"><option value="all">{text("Tous les niveaux publiables", "All publishable levels")}</option><option value="validated">{documentationStatusLabels.validated[locale]}</option></select></label>
        <div className="rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm text-slate-700"><p className="font-black text-slate-900">{text("Périmètre", "Scope")}</p><p>{text("Candidatures officielles du scrutin", "Official candidacies for the election")}</p></div>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label={text("Vue de comparaison", "Comparison view")}>
        {(Object.keys(comparisonViewLabels) as PresidentialComparisonView[]).map((view) => <button key={view} type="button" role="tab" aria-selected={comparisonView === view} aria-controls="presidential-environmental-archive-results" className={`rounded-full border px-4 py-2 text-sm font-black transition ${comparisonView === view ? "border-amber-500 bg-amber-100 text-amber-950" : "border-amber-200 text-amber-900 hover:bg-amber-50"}`} onClick={() => setComparisonView(view)}>{text(comparisonViewLabels[view].fr, comparisonViewLabels[view].en)}</button>)}
      </div>

      <div id="presidential-environmental-archive-results" className="space-y-4">
        {source ? <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4 text-sm text-slate-700"><p className="font-black text-slate-900">{text("Source de la liste officielle", "Official candidate-list source")}</p><p className="mt-1">{source.name[locale]} · {sourceTypeLabels[source.type][locale]}</p>{source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex font-black text-amber-800 underline">{text("Ouvrir la source d’origine", "Open the source of record")}</a> : null}</div> : null}

        {year === 2027 ? <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-5 text-center" role="status"><p className="font-black text-slate-900">{text("Présidentielle 2027 : dossier en préparation", "2027 presidential election: preparation file")}</p><p className="mt-1 text-sm text-slate-700">{text("Aucune candidature officielle ni politique n’est préremplie. Les documents seront ajoutés seulement après publication et contrôle.", "No official candidacy or policy is prefilled. Documents will be added only after publication and review.")}</p></div> : null}

        <div className="rounded-2xl border border-amber-100 bg-white p-4">
          <div className="flex flex-col gap-1 text-slate-800 sm:flex-row sm:items-baseline sm:justify-between"><h4 className="text-lg font-black text-slate-950">{text(`Candidatures officielles ${year}`, `Official candidacies ${year}`)}</h4><span className="text-sm text-slate-800">{yearCandidates.length} {text("candidats recensés", "candidates listed")}</span></div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2" aria-label={text(`Candidats officiels ${year}`, `Official candidates ${year}`)}>{yearCandidates.map((candidate) => <li key={candidate.id} className="rounded-xl border border-amber-100 bg-amber-50/30 p-3"><p className="font-black text-slate-950">{candidate.name[locale]}</p><p className="text-sm text-slate-700">{candidate.partyOrCoalition}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-amber-800">{candidate.documentationStatus === "not_collected" ? text("Corpus non encore collecté", "Corpus not yet collected") : text("Engagements en brouillon", "Commitments in draft")}</p></li>)}</ol>
        </div>

        {visibleCommitments.length === 0 ? <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-5 text-center" role="status"><p className="font-black text-slate-900">{text("Aucun engagement validé n’est affiché pour ce millésime.", "No validated commitment is displayed for this election year.")}</p><p className="mt-1 text-sm text-slate-600">{text("Les sources secondaires, les discours et les programmes non revus restent hors de la vue publique ; l’absence d’extrait ne signifie pas l’absence de position.", "Secondary sources, speeches and unreviewed programmes stay out of the public view; an absent extract does not mean an absent position.")}</p></div> : <ol className="space-y-3" aria-label={text(comparisonView === "theme" ? "Engagements par thème" : "Engagements par candidature", comparisonView === "theme" ? "Commitments by theme" : "Commitments by candidate")}>{visibleCommitments.map((commitment) => <li key={commitment.id} data-commitment-id={commitment.id} className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4"><div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide text-amber-800"><span>{commitment.electionYear}</span><span aria-hidden="true">·</span><span>{commitment.theme[locale]}</span><span aria-hidden="true">·</span><span>{commitment.candidateName[locale]}</span></div><h4 className="mt-1 text-lg font-black text-slate-950">{commitment.formulationAttributed[locale]}</h4><p className="mt-2 cmm-text-body">{text("Source d’origine", "Source of record")}: {commitment.source.name[locale]} · {sourceTypeLabels[commitment.source.type][locale]}</p><details className="mt-3 rounded-xl border border-amber-200 bg-white p-3"><summary className="cursor-pointer font-black text-amber-900">{text("Détail de la source et du suivi", "Source and follow-up details")}</summary><dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2"><div><dt className="font-black">{text("Niveau", "Level")}</dt><dd>{documentationStatusLabels[commitment.documentationStatus][locale]}</dd></div><div><dt className="font-black">{text("Version", "Version")}</dt><dd>{commitment.source.version}</dd></div><div><dt className="font-black">{text("Date du document", "Document date")}</dt><dd>{formatPolicyDate(commitment.source.publishedAt, locale)}</dd></div><div><dt className="font-black">{text("Page", "Page")}</dt><dd>{commitment.source.page ?? text("Non précisée", "Not specified")}</dd></div><div><dt className="font-black">{text("Dernière consultation", "Last consultation")}</dt><dd>{commitment.source.checkedAt ?? text("Non précisée", "Not specified")}</dd></div><div><dt className="font-black">{text("Suivi de l’engagement", "Commitment follow-up")}</dt><dd>{followUpStatusLabels[commitment.followUpStatus][locale]}</dd></div></dl><ul className="mt-3 space-y-2 text-sm text-slate-700">{commitment.limitations.map((limitation, index) => <li key={`${commitment.id}-limitation-${index}`}>{limitation[locale]}</li>)}<li>{text("Ce suivi ne constitue ni une preuve d’adoption juridique ni un résultat d’impact observé.", "This follow-up is neither proof of legal adoption nor an observed impact result.")}</li></ul>{commitment.source.url ? <a href={commitment.source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex font-black text-amber-800 underline">{text("Consulter le document source", "Consult source document")}</a> : null}</details></li>)}</ol>}
      </div>
    </section>
  );
}
