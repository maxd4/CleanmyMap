"use client";

import { useMemo, useState } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { formatPolicyDate } from "@/lib/learning/policies/environmental-policy-filtering";
import { filterPresidentialCommitments, groupPresidentialCommitmentsByClassification, sortPresidentialCommitments } from "@/lib/learning/policies/presidential-environmental-filtering";
import type { PresidentialCommitmentDocumentationStatus, PresidentialComparisonView, PresidentialEnvironmentalClassification, PresidentialEnvironmentalDomain, PresidentialEnvironmentalDomainAssessment, PresidentialPublicArchive, PresidentialPublicCommitment, PresidentialSourceType } from "@/lib/learning/policies/presidential-environmental-corpus";

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

const classificationLabels: Record<PresidentialEnvironmentalClassification, { fr: string; en: string }> = {
  favorable: { fr: "Effet favorable", en: "Favorable effect" },
  unfavorable: { fr: "Effet défavorable", en: "Unfavorable effect" },
  mixed: { fr: "Effets mixtes", en: "Mixed effects" },
  neutral: { fr: "Effet neutre", en: "Neutral effect" },
  undetermined: { fr: "Effet non déterminé", en: "Undetermined effect" },
};

const domainLabels: Record<PresidentialEnvironmentalDomain, { fr: string; en: string }> = {
  climate: { fr: "Climat", en: "Climate" },
  biodiversity: { fr: "Biodiversité", en: "Biodiversity" },
  water: { fr: "Eau", en: "Water" },
  pollution: { fr: "Pollution", en: "Pollution" },
  resources: { fr: "Ressources", en: "Resources" },
  waste: { fr: "Déchets", en: "Waste" },
};

function PresidentialCommitmentCard({ commitment, locale, text }: { commitment: PresidentialPublicCommitment; locale: "fr" | "en"; text: (fr: string, en: string) => string }) {
  const assessment = commitment.environmentalAssessment;
  const classification = assessment?.overallClassification ?? "undetermined";
  const domainAssessments = Object.entries(assessment?.domains ?? {}) as [PresidentialEnvironmentalDomain, PresidentialEnvironmentalDomainAssessment][];

  return <li data-commitment-id={commitment.id} className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4">
    <div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide text-amber-800"><span>{commitment.electionYear}</span><span aria-hidden="true">·</span><span>{commitment.theme[locale]}</span><span aria-hidden="true">·</span><span>{commitment.candidateName[locale]}</span></div>
    <header className="mt-1 flex flex-wrap items-start justify-between gap-2"><h4 className="text-lg font-black text-slate-950">{commitment.formulationAttributed[locale]}</h4><span className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-black text-slate-900">{classificationLabels[classification][locale]}</span></header>
    <p className="mt-2 cmm-text-body">{text("Source d’origine", "Source of record")}: {commitment.source.name[locale]} · {sourceTypeLabels[commitment.source.type][locale]}</p>
    <details className="mt-3 rounded-xl border border-amber-200 bg-white p-3"><summary className="cursor-pointer font-black text-amber-900">{text("Détail de la source et du suivi", "Source and follow-up details")}</summary><dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2"><div><dt className="font-black">{text("Niveau", "Level")}</dt><dd>{documentationStatusLabels[commitment.documentationStatus][locale]}</dd></div><div><dt className="font-black">{text("Version", "Version")}</dt><dd>{commitment.source.version}</dd></div><div><dt className="font-black">{text("Date du document", "Document date")}</dt><dd>{formatPolicyDate(commitment.source.publishedAt, locale)}</dd></div><div><dt className="font-black">{text("Page", "Page")}</dt><dd>{commitment.source.page ?? text("Non précisée", "Not specified")}</dd></div><div><dt className="font-black">{text("Dernière consultation", "Last consultation")}</dt><dd>{commitment.source.checkedAt ?? text("Non précisée", "Not specified")}</dd></div><div><dt className="font-black">{text("Suivi de l’engagement", "Commitment follow-up")}</dt><dd>{followUpStatusLabels[commitment.followUpStatus][locale]}</dd></div></dl><ul className="mt-3 space-y-2 text-sm text-slate-700">{commitment.limitations.map((limitation, index) => <li key={`${commitment.id}-limitation-${index}`}>{limitation[locale]}</li>)}<li>{text("Ce suivi ne constitue ni une preuve d’adoption juridique ni un résultat d’impact observé.", "This follow-up is neither proof of legal adoption nor an observed impact result.")}</li></ul>{commitment.source.url ? <a href={commitment.source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex font-black text-amber-800 underline">{text("Consulter le document source", "Consult source document")}</a> : null}</details>
    {assessment ? <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><summary className="cursor-pointer font-black text-slate-900">{text("Méthodologie et analyse environnementale", "Method and environmental analysis")}</summary><dl className="mt-3 grid gap-2 text-sm text-slate-700"><div><dt className="font-black">{text("Intention du programme", "Programme intent")}</dt><dd>{assessment.intent[locale]}</dd></div><div><dt className="font-black">{text("Effet attendu", "Expected effect")}</dt><dd>{assessment.expectedEffect[locale]}</dd></div><div><dt className="font-black">{text("Effet observé", "Observed effect")}</dt><dd>{assessment.observedEffect?.[locale] ?? text("Non documenté", "Not documented")}</dd></div><div><dt className="font-black">{text("Revue", "Review")}</dt><dd>{assessment.reviewedAt} · {assessment.reviewedBy}</dd></div></dl><ul className="mt-3 space-y-3 text-sm text-slate-700">{domainAssessments.map(([domain, domainAssessment]) => <li key={domain} className="rounded-lg border border-slate-200 bg-white p-2"><p className="font-black text-slate-900">{domainLabels[domain][locale]} · {classificationLabels[domainAssessment.classification][locale]}</p><p><span className="font-bold">{text("Justification : ", "Justification: ")}</span>{domainAssessment.justification[locale]}</p><p><span className="font-bold">{text("Mécanisme : ", "Mechanism: ")}</span>{domainAssessment.mechanism[locale]}</p><p><span className="font-bold">{text("Hypothèses : ", "Assumptions: ")}</span>{domainAssessment.hypotheses[locale]}</p><p><span className="font-bold">{text("Limites : ", "Limitations: ")}</span>{domainAssessment.limitations[locale]}</p><p><span className="font-bold">{text("Incertitudes : ", "Uncertainties: ")}</span>{domainAssessment.uncertainties[locale]}</p><p><span className="font-bold">{text("Preuve : ", "Evidence: ")}</span>{domainAssessment.evidenceLevel} · {domainAssessment.source.version}</p></li>)}</ul></details> : null}
  </li>;
}

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
  const yearCandidates = candidates
    .filter((candidateRecord) => candidateRecord.electionYear === year)
    .sort((left, right) => Number(right.id === election?.electedCandidateId) - Number(left.id === election?.electedCandidateId) || left.name[locale].localeCompare(right.name[locale], locale));
  const visibleCommitments = useMemo(() => sortPresidentialCommitments(filterPresidentialCommitments(validatedCommitments, { year, theme, candidateId: candidateId === "all" ? undefined : candidateId, documentationStatus, locale }), comparisonView, locale), [candidateId, comparisonView, documentationStatus, locale, theme, year, validatedCommitments]);
  const classificationGroups = useMemo(() => groupPresidentialCommitmentsByClassification(visibleCommitments), [visibleCommitments]);
  const validatedThemes = useMemo(() => Array.from(new Set(validatedCommitments.filter((commitment) => commitment.electionYear === year).map((commitment) => commitment.theme[locale]))).sort(), [locale, validatedCommitments, year]);
  const candidateListSource = election?.candidateListSource;
  const resultSource = election?.resultSource;
  const electedCandidate = yearCandidates.find((candidate) => candidate.id === election?.electedCandidateId);
  const mandateLabel = election?.mandate
    ? text(`Mandat ${election.mandate.start.value}–${election.mandate.end.value}`, `Term ${election.mandate.start.value}–${election.mandate.end.value}`)
    : null;
  const mandateStatusLabel = election?.mandate?.status === "ongoing" ? text("Mandat en cours", "Current term") : election?.mandate?.status === "completed" ? text("Mandat terminé", "Term completed") : null;
  const renderCommitmentList = (commitments: PresidentialPublicCommitment[], label: string) => <ol className="space-y-3" aria-label={label}>{commitments.map((commitment) => <PresidentialCommitmentCard key={commitment.id} commitment={commitment} locale={locale} text={text} />)}</ol>;

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
        {candidateListSource || resultSource ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4 text-sm text-slate-700">
              <p className="font-black text-slate-900">{text("Source de la liste officielle", "Official candidate-list source")}</p>
              {candidateListSource ? <><p className="mt-1">{candidateListSource.name[locale]} · {sourceTypeLabels[candidateListSource.type][locale]}</p>{candidateListSource.url ? <a href={candidateListSource.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex font-black text-amber-800 underline">{text("Ouvrir la source d’origine", "Open the source of record")}</a> : null}</> : null}
            </div>
            {resultSource ? <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm text-slate-700">
              <p className="font-black text-slate-900">{text("Résultat officiel et mandat", "Official result and term")}</p>
              <p className="mt-1">{resultSource.name[locale]} · {resultSource.publishedAt.value}</p>
              {mandateLabel && mandateStatusLabel ? <p className="mt-1 font-bold text-blue-900">{mandateLabel} · {mandateStatusLabel}</p> : null}
              {electedCandidate ? <p className="mt-1">{text("Élu : ", "Elected: ")}{electedCandidate.name[locale]}</p> : null}
              {resultSource.url ? <a href={resultSource.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex font-black text-blue-800 underline">{text("Vérifier le résultat officiel", "Verify official result")}</a> : null}
            </div> : null}
          </div>
        ) : null}

        {year === 2027 ? <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-5 text-center" role="status"><p className="font-black text-slate-900">{text("Présidentielle 2027 : dossier en préparation", "2027 presidential election: preparation file")}</p><p className="mt-1 text-sm text-slate-700">{text("Aucune candidature officielle ni politique n’est préremplie. Les documents seront ajoutés seulement après publication et contrôle.", "No official candidacy or policy is prefilled. Documents will be added only after publication and review.")}</p></div> : null}

        <div className="rounded-2xl border border-amber-100 bg-white p-4">
          <div className="flex flex-col gap-1 text-slate-800 sm:flex-row sm:items-baseline sm:justify-between"><h4 className="text-lg font-black text-slate-950">{text(`Candidatures officielles ${year}`, `Official candidacies ${year}`)}</h4><span className="text-sm text-slate-800">{yearCandidates.length} {text("candidats recensés", "candidates listed")}</span></div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2" aria-label={text(`Candidats officiels ${year}`, `Official candidates ${year}`)}>{yearCandidates.map((candidate) => <li key={candidate.id} className={`rounded-xl border p-3 ${candidate.id === election?.electedCandidateId ? "border-blue-400 bg-blue-50/70" : "border-amber-100 bg-amber-50/30"}`}>{candidate.id === election?.electedCandidateId ? <p className="mb-1 text-xs font-black uppercase tracking-wide text-blue-800">{text("Élu", "Elected")}</p> : null}<p className="font-black text-slate-950">{candidate.name[locale]}</p><p className="text-sm text-slate-700">{candidate.partyOrCoalition}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-amber-800">{candidate.documentationStatus === "not_collected" ? text("Corpus non encore collecté", "Corpus not yet collected") : text("Engagements en brouillon", "Commitments in draft")}</p></li>)}</ol>
        </div>

        {visibleCommitments.length === 0 ? <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-5 text-center" role="status"><p className="font-black text-slate-900">{text("Aucun engagement validé n’est affiché pour ce millésime.", "No validated commitment is displayed for this election year.")}</p><p className="mt-1 text-sm text-slate-600">{text("Les sources secondaires, les discours et les programmes non revus restent hors de la vue publique ; l’absence d’extrait ne signifie pas l’absence de position.", "Secondary sources, speeches and unreviewed programmes stay out of the public view; an absent extract does not mean an absent position.")}</p></div> : <>
          <div className="grid gap-4 md:grid-cols-2">
            <section aria-labelledby="presidential-effects-favorable"><h4 id="presidential-effects-favorable" className="mb-2 text-lg font-black text-emerald-900">{text("Effets favorables", "Favorable effects")}</h4>{renderCommitmentList(classificationGroups.favorable, text("Engagements à effets favorables", "Commitments with favorable effects"))}</section>
            <section aria-labelledby="presidential-effects-unfavorable"><h4 id="presidential-effects-unfavorable" className="mb-2 text-lg font-black text-rose-900">{text("Effets défavorables", "Unfavorable effects")}</h4>{renderCommitmentList(classificationGroups.unfavorable, text("Engagements à effets défavorables", "Commitments with unfavorable effects"))}</section>
          </div>
          <section aria-labelledby="presidential-effects-mixed"><h4 id="presidential-effects-mixed" className="mb-2 text-lg font-black text-amber-900">{text("Effets mixtes", "Mixed effects")}</h4>{renderCommitmentList(classificationGroups.mixed, text("Engagements à effets mixtes", "Commitments with mixed effects"))}</section>
          <section aria-labelledby="presidential-effects-neutral"><h4 id="presidential-effects-neutral" className="mb-2 text-lg font-black text-slate-900">{text("Effets neutres", "Neutral effects")}</h4>{renderCommitmentList(classificationGroups.neutral, text("Engagements à effets neutres", "Commitments with neutral effects"))}</section>
          <section aria-labelledby="presidential-effects-undetermined"><h4 id="presidential-effects-undetermined" className="mb-2 text-lg font-black text-slate-900">{text("Effets non déterminés", "Undetermined effects")}</h4>{renderCommitmentList(classificationGroups.undetermined, text("Engagements à effets non déterminés", "Commitments with undetermined effects"))}</section>
        </>}
      </div>
    </section>
  );
}
