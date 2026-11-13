"use client";

import { useMemo, useState } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  filterPresidentialCommitments,
  getPresidentialCandidates,
  getPresidentialElection,
  getValidatedPresidentialCommitments,
  type PresidentialSourceType,
} from "@/lib/learning/policies/presidential-environmental-corpus";

type ArchiveYear = 2012 | 2017;

const sourceTypeLabels: Record<PresidentialSourceType, { fr: string; en: string }> = {
  SOURCE_PRIMAIRE_OFFICIELLE: { fr: "Source primaire officielle", en: "Official primary source" },
  SOURCE_PRIMAIRE_ARCHIVEE: { fr: "Source primaire archivée", en: "Archived primary source" },
  PRIMARY_ARCHIVED: { fr: "Source primaire archivée", en: "Archived primary source" },
  PRIMARY_PARTY_PROGRAM: { fr: "Programme de parti", en: "Party programme" },
  DISCOURS_OFFICIEL: { fr: "Discours officiel", en: "Official speech" },
  SOURCE_SECONDAIRE: { fr: "Source secondaire", en: "Secondary source" },
  EN_ATTENTE_DE_PREUVE: { fr: "Preuve à retrouver", en: "Evidence to be found" },
};

const archiveYears: ArchiveYear[] = [2012, 2017];

export function PresidentialEnvironmentalArchive() {
  const { locale } = useSitePreferences();
  const [year, setYear] = useState<ArchiveYear>(2012);
  const [theme, setTheme] = useState("all");
  const isFrench = locale === "fr";
  const text = (fr: string, en: string) => (isFrench ? fr : en);
  const election = getPresidentialElection(year);
  const candidates = getPresidentialCandidates(year);
  const validatedCommitments = useMemo(() => filterPresidentialCommitments(getValidatedPresidentialCommitments(), { year, theme, locale }), [locale, theme, year]);
  const validatedThemes = useMemo(() => Array.from(new Set(getValidatedPresidentialCommitments().filter((commitment) => commitment.electionYear === year).map((commitment) => commitment.theme[locale]))).sort(), [locale, year]);
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
          <button key={archiveYear} type="button" role="tab" aria-selected={year === archiveYear} aria-controls="presidential-environmental-archive-results" className={`rounded-full px-4 py-2 text-sm font-black transition ${year === archiveYear ? "bg-amber-500 text-white" : "text-amber-900 hover:bg-amber-100"}`} onClick={() => { setYear(archiveYear); setTheme("all"); }}>
            {archiveYear}
          </button>
        ))}
      </div>

      <div className="grid gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-bold text-slate-800"><span>{text("Thème des engagements validés", "Validated commitment theme")}</span><select aria-label={text("Filtrer les engagements par thème", "Filter commitments by theme")} value={theme} onChange={(event) => setTheme(event.target.value)} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 font-normal outline-none ring-amber-400 focus:ring-2"><option value="all">{text("Tous les thèmes validés", "All validated themes")}</option>{validatedThemes.map((validatedTheme) => <option key={validatedTheme} value={validatedTheme}>{validatedTheme}</option>)}</select></label>
        <div className="rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm text-slate-700"><p className="font-black text-slate-900">{text("Périmètre", "Scope")}</p><p>{text("Candidatures officielles du scrutin", "Official candidacies for the election")}</p></div>
      </div>

      <div id="presidential-environmental-archive-results" className="space-y-4">
        {source ? <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4 text-sm text-slate-700"><p className="font-black text-slate-900">{text("Source de la liste officielle", "Official candidate-list source")}</p><p className="mt-1">{source.name[locale]} · {sourceTypeLabels[source.type][locale]}</p>{source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex font-black text-amber-800 underline">{text("Ouvrir la source d’origine", "Open the source of record")}</a> : null}</div> : null}

        <div className="rounded-2xl border border-amber-100 bg-white p-4">
          <div className="flex flex-col gap-1 text-slate-800 sm:flex-row sm:items-baseline sm:justify-between"><h4 className="text-lg font-black text-slate-950">{text(`Candidatures officielles ${year}`, `Official candidacies ${year}`)}</h4><span className="text-sm text-slate-800">{candidates.length} {text("candidats recensés", "candidates listed")}</span></div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2" aria-label={text(`Candidats officiels ${year}`, `Official candidates ${year}`)}>{candidates.map((candidate) => <li key={candidate.id} className="rounded-xl border border-amber-100 bg-amber-50/30 p-3"><p className="font-black text-slate-950">{candidate.name[locale]}</p><p className="text-sm text-slate-700">{candidate.partyOrCoalition}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-amber-800">{text("Corpus non encore collecté", "Corpus not yet collected")}</p></li>)}</ol>
        </div>

        {validatedCommitments.length === 0 ? <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-5 text-center" role="status"><p className="font-black text-slate-900">{text("Aucun engagement validé n’est affiché pour ce millésime.", "No validated commitment is displayed for this election year.")}</p><p className="mt-1 text-sm text-slate-600">{text("Les sources secondaires, les discours et les programmes non revus restent hors de la vue publique ; l’absence d’extrait ne signifie pas l’absence de position.", "Secondary sources, speeches and unreviewed programmes stay out of the public view; an absent extract does not mean an absent position.")}</p></div> : <ol className="space-y-3" aria-label={text("Engagements environnementaux validés", "Validated environmental commitments")}>{validatedCommitments.map((commitment) => <li key={commitment.id} className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4"><div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide text-amber-800"><span>{commitment.electionYear}</span><span aria-hidden="true">·</span><span>{commitment.theme[locale]}</span></div><h4 className="mt-1 text-lg font-black text-slate-950">{commitment.candidateName[locale]}</h4><p className="mt-2 cmm-text-body">{commitment.formulationAttributed[locale]}</p><p className="mt-3 text-sm text-slate-700">{text("Source d’origine", "Source of record")}: {commitment.source.name[locale]} · {sourceTypeLabels[commitment.source.type][locale]}</p>{commitment.source.url ? <a href={commitment.source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex font-black text-amber-800 underline">{text("Consulter la source", "Consult source")}</a> : null}</li>)}</ol>}
      </div>
    </section>
  );
}
