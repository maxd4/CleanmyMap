import "server-only";
import { assertPublishedContent, type ContentValidationRecord } from "@/lib/content/content-validation";
import type { LocalizedText, PolicyDate } from "./environmental-policy-registry";

export { filterPresidentialCommitments, sortPresidentialCommitments } from "./presidential-environmental-filtering";

export type PresidentialElectionYear = 2012 | 2017 | 2022 | 2027;
export type PresidentialCandidateStatus = "official" | "not_published";
export type PresidentialCandidateDocumentationStatus = "not_collected" | "draft" | "reviewed_no_measure_identified" | "source_insufficient" | "validated";
export type PresidentialCommitmentDocumentationStatus = "not_collected" | "no_measure_identified_after_review" | "not_quantified" | "deadline_unspecified" | "source_insufficient" | "draft" | "validated";
export type PresidentialSourceType = "SOURCE_PRIMAIRE_OFFICIELLE" | "SOURCE_PRIMAIRE_ARCHIVEE" | "PRIMARY_ARCHIVED" | "PRIMARY_PARTY_PROGRAM" | "DISCOURS_OFFICIEL" | "SOURCE_SECONDAIRE" | "EN_ATTENTE_DE_PREUVE";
export type PresidentialSourceStatus = "verified" | "needs_review" | "insufficient" | "missing";
export type PresidentialDocumentNature = "candidate_list" | "election_result" | "programme" | "profession_de_foi" | "speech" | "proposal" | "secondary_summary" | "unknown";
export type PresidentialHistoryAction = "first_collected" | "substantive_amendment" | "withdrawn" | "rechecked";
export type PresidentialCommitmentFollowUpStatus = "realized" | "in_progress" | "modified" | "abandoned" | "not_documented";
export type PresidentialComparisonView = "theme" | "candidate";
export type PresidentialMandateStatus = "completed" | "ongoing";
export type PresidentialEnvironmentalClassification = "favorable" | "unfavorable" | "mixed" | "neutral" | "undetermined";
export type PresidentialEnvironmentalDomain = "climate" | "biodiversity" | "water" | "pollution" | "resources" | "waste";
export type PresidentialAssessmentEvidenceLevel = "limited" | "moderate" | "strong";

export const PRESIDENTIAL_ENVIRONMENTAL_DOMAINS: PresidentialEnvironmentalDomain[] = ["climate", "biodiversity", "water", "pollution", "resources", "waste"];
const PRESIDENTIAL_ENVIRONMENTAL_CLASSIFICATIONS: PresidentialEnvironmentalClassification[] = ["favorable", "unfavorable", "mixed", "neutral", "undetermined"];

export type PresidentialEnvironmentalDomainAssessment = {
  classification: PresidentialEnvironmentalClassification;
  source: PresidentialSource;
  justification: LocalizedText;
  mechanism: LocalizedText;
  hypotheses: LocalizedText;
  limitations: LocalizedText;
  uncertainties: LocalizedText;
  evidenceLevel: PresidentialAssessmentEvidenceLevel;
};

export type PresidentialEnvironmentalAssessment = {
  overallClassification: PresidentialEnvironmentalClassification;
  intent: LocalizedText;
  expectedEffect: LocalizedText;
  observedEffect: LocalizedText | null;
  reviewedAt: string;
  reviewedBy: string;
  domains: Partial<Record<PresidentialEnvironmentalDomain, PresidentialEnvironmentalDomainAssessment>>;
};

export type PresidentialMandatePeriod = {
  start: PolicyDate;
  end: PolicyDate;
  status: PresidentialMandateStatus;
};

export type PresidentialSource = {
  type: PresidentialSourceType;
  status: PresidentialSourceStatus;
  name: LocalizedText;
  url: string | null;
  documentNature: PresidentialDocumentNature;
  version: string;
  publishedAt: PolicyDate;
  page: number | null;
  checkedAt: string | null;
  note: LocalizedText;
};

export type PresidentialCandidateRecord = {
  id: string;
  electionYear: PresidentialElectionYear;
  name: LocalizedText;
  partyOrCoalition: string;
  status: PresidentialCandidateStatus;
  documentationStatus: PresidentialCandidateDocumentationStatus;
  candidateListSource: PresidentialSource;
  validation: ContentValidationRecord;
};

export type PresidentialElectionRecord = {
  year: PresidentialElectionYear;
  label: LocalizedText;
  candidateListStatus: "official_list" | "not_published";
  candidateListSource: PresidentialSource;
  resultSource: PresidentialSource | null;
  secondRoundDate: PolicyDate | null;
  electedCandidateId: string | null;
  mandate: PresidentialMandatePeriod | null;
  candidateIds: string[];
};

export type PresidentialCommitmentVersion = {
  id: string;
  recordedAt: string;
  sourceVersion: string;
  changeNote: LocalizedText;
};

export type PresidentialCommitmentHistoryEntry = {
  id: string;
  recordedAt: string;
  action: PresidentialHistoryAction;
  sourceVersion: string;
  note: LocalizedText;
};

export type PresidentialEnvironmentalCommitment = {
  id: string;
  electionYear: PresidentialElectionYear;
  candidateId: string;
  candidateName: LocalizedText;
  partyOrCoalition: string;
  theme: LocalizedText;
  formulationAttributed: LocalizedText;
  source: PresidentialSource;
  deadline: PolicyDate;
  announcedUnits: string | null;
  mechanism: LocalizedText;
  limitations: LocalizedText[];
  followUpStatus: PresidentialCommitmentFollowUpStatus;
  firstCollectedAt: string;
  lastCheckedAt: string | null;
  documentationStatus: PresidentialCommitmentDocumentationStatus;
  versions: PresidentialCommitmentVersion[];
  history: PresidentialCommitmentHistoryEntry[];
  deduplicationKey: string;
  environmentalAssessment: PresidentialEnvironmentalAssessment | null;
  validation: ContentValidationRecord;
};

export type PresidentialEnvironmentalCorpus = {
  elections: PresidentialElectionRecord[];
  candidates: PresidentialCandidateRecord[];
  commitments: PresidentialEnvironmentalCommitment[];
};

export type PresidentialPublicCandidate = Omit<PresidentialCandidateRecord, "validation">;
export type PresidentialPublicCommitment = Omit<PresidentialEnvironmentalCommitment, "validation">;
export type PresidentialPublicArchive = {
  elections: PresidentialElectionRecord[];
  candidates: PresidentialPublicCandidate[];
  validatedCommitments: PresidentialPublicCommitment[];
};

const COLLECTED_AT = "2026-11-13";
const UNKNOWN_DATE: PolicyDate = { value: null, precision: "unknown" };

const localized = (fr: string, en = fr): LocalizedText => ({ fr, en });

function isValidPolicyDate(date: PolicyDate): boolean {
  if (date.precision === "unknown") return date.value === null;
  if (!date.value) return false;
  if (date.precision === "year") return /^\d{4}$/.test(date.value);
  if (date.precision === "month") return /^\d{4}-(0[1-9]|1[0-2])$/.test(date.value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value)) return false;

  const parsed = new Date(`${date.value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date.value;
}

function validationDraft(id: string, source: PresidentialSource, claim: LocalizedText): ContentValidationRecord {
  return {
    id,
    kind: "environmental",
    status: "draft",
    owner: "CleanMyMap — équipe éditoriale",
    source: {
      name: source.name.fr,
      url: source.url ?? "",
      date: source.publishedAt.value,
      datePrecision: source.publishedAt.precision,
      dateBasis: source.publishedAt.precision === "unknown" ? "unknown" : "document",
    },
    evidenceLevel: "limited",
    lastReviewedAt: null,
    reviewedBy: null,
    claims: {
      fact: [{ id: `${id}-claim`, type: "fact", text: claim }],
      estimate: [],
      recommendation: [],
    },
  };
}

function sourceRef(input: Partial<PresidentialSource> & Pick<PresidentialSource, "name" | "type" | "documentNature" | "version">): PresidentialSource {
  return {
    type: input.type,
    status: input.status ?? "needs_review",
    name: input.name,
    url: input.url ?? null,
    documentNature: input.documentNature,
    version: input.version,
    publishedAt: input.publishedAt ?? UNKNOWN_DATE,
    page: input.page ?? null,
    checkedAt: input.checkedAt ?? null,
    note: input.note ?? localized("Point d’entrée documentaire à contrôler avant toute publication.", "Documentary entry point to be checked before publication."),
  };
}

const officialListSources: Record<PresidentialElectionYear, PresidentialSource> = {
  2012: sourceRef({
    type: "SOURCE_PRIMAIRE_ARCHIVEE",
    name: localized("Ministère de l’Intérieur — archives présidentielle 2012", "Ministry of the Interior — 2012 presidential archive"),
    url: "https://www.archives-resultats-elections.interieur.gouv.fr/resultats/PR2012/FE.php",
    documentNature: "candidate_list",
    version: "PR2012-FE",
    publishedAt: UNKNOWN_DATE,
    status: "verified",
    note: localized("Archive officielle des résultats et de la liste du premier tour ; elle ne constitue pas à elle seule une source de programme.", "Official archive of results and the first-round list; it is not by itself a programme source."),
  }),
  2017: sourceRef({
    type: "SOURCE_PRIMAIRE_ARCHIVEE",
    name: localized("Ministère de l’Intérieur — liste des candidats 2017", "Ministry of the Interior — 2017 candidate list"),
    url: "https://www.interieur.gouv.fr/archive/election-presidentielle-2017-liste-des-candidats",
    documentNature: "candidate_list",
    version: "MI-2017-03-23",
    publishedAt: { value: "2017-03-23", precision: "day" },
    status: "verified",
    note: localized("La page rappelle que la liste a été arrêtée par le Conseil constitutionnel ; elle ne constitue pas à elle seule une source de programme.", "The page states that the list was set by the Constitutional Council; it is not by itself a programme source."),
  }),
  2022: sourceRef({
    type: "SOURCE_PRIMAIRE_OFFICIELLE",
    name: localized("CNCCEP — déclarations des candidats 2022", "CNCCEP — 2022 candidate statements"),
    url: "https://www.cnccep.fr/candidats.html",
    documentNature: "candidate_list",
    version: "CNCCEP-2022-candidats",
    publishedAt: UNKNOWN_DATE,
    status: "verified",
    note: localized("Point d’entrée officiel vers les déclarations et professions de foi ; l’extraction des mesures reste individuelle.", "Official entry point to candidate statements and professions of faith; measures still require individual extraction."),
  }),
  2027: sourceRef({
    type: "EN_ATTENTE_DE_PREUVE",
    name: localized("Élection présidentielle 2027 — liste officielle non publiée", "2027 presidential election — official list not published"),
    documentNature: "candidate_list",
    version: "2027-not-published",
    status: "missing",
    note: localized("Aucune candidature officielle ni aucun programme n’est prérempli dans ce corpus.", "No official candidacy or programme is prefilled in this corpus."),
  }),
};

const officialResultSources: Record<PresidentialElectionYear, PresidentialSource | null> = {
  2012: sourceRef({
    type: "SOURCE_PRIMAIRE_ARCHIVEE",
    name: localized("Ministère de l’Intérieur — résultats officiels présidentielle 2012", "Ministry of the Interior — official 2012 presidential results"),
    url: "https://www.archives-resultats-elections.interieur.gouv.fr/resultats/PR2012/FE.php",
    documentNature: "election_result",
    version: "PR2012-FE-2T",
    publishedAt: { value: "2012-05-06", precision: "day" },
    status: "verified",
    note: localized("Résultats officiels du second tour : François Hollande est arrivé en tête avec 51,64 % des suffrages exprimés.", "Official second-round results: François Hollande came first with 51.64% of votes cast."),
  }),
  2017: sourceRef({
    type: "SOURCE_PRIMAIRE_ARCHIVEE",
    name: localized("Ministère de l’Intérieur — résultats officiels présidentielle 2017", "Ministry of the Interior — official 2017 presidential results"),
    url: "https://www.archives-resultats-elections.interieur.gouv.fr/resultats/presidentielle-2017/FE.php",
    documentNature: "election_result",
    version: "PRES2017-FE-2T",
    publishedAt: { value: "2017-05-07", precision: "day" },
    status: "verified",
    note: localized("Résultats officiels du second tour : Emmanuel Macron est arrivé en tête avec 66,10 % des suffrages exprimés.", "Official second-round results: Emmanuel Macron came first with 66.10% of votes cast."),
  }),
  2022: sourceRef({
    type: "SOURCE_PRIMAIRE_ARCHIVEE",
    name: localized("Ministère de l’Intérieur — résultats officiels présidentielle 2022", "Ministry of the Interior — official 2022 presidential results"),
    url: "https://www.archives-resultats-elections.interieur.gouv.fr/resultats/presidentielle-2022/FE.php",
    documentNature: "election_result",
    version: "PRES2022-FE-2T",
    publishedAt: { value: "2022-04-24", precision: "day" },
    status: "verified",
    note: localized("Résultats officiels du second tour : Emmanuel Macron est arrivé en tête avec 58,55 % des suffrages exprimés.", "Official second-round results: Emmanuel Macron came first with 58.55% of votes cast."),
  }),
  2027: null,
};

const candidate = (electionYear: PresidentialElectionYear, id: string, frName: string, partyOrCoalition: string, documentationStatus: PresidentialCandidateDocumentationStatus = "not_collected"): PresidentialCandidateRecord => {
  const source = officialListSources[electionYear];
  return {
    id: `${electionYear}-${id}`,
    electionYear,
    name: localized(frName),
    partyOrCoalition,
    status: "official",
    documentationStatus,
    candidateListSource: source,
    validation: validationDraft(`${electionYear}-${id}-candidate-validation`, source, localized(`Candidature officielle de ${frName} à documenter dans le corpus environnemental.`, `Official candidacy of ${frName} to be documented in the environmental corpus.`)),
  };
};

const candidateRecords: PresidentialCandidateRecord[] = [
  candidate(2012, "francois-hollande", "François Hollande", "Parti socialiste"),
  candidate(2012, "nicolas-sarkozy", "Nicolas Sarkozy", "Union pour un mouvement populaire"),
  candidate(2012, "eva-joly", "Eva Joly", "Europe Écologie Les Verts"),
  candidate(2012, "marine-le-pen", "Marine Le Pen", "Front national"),
  candidate(2012, "francois-bayrou", "François Bayrou", "Mouvement démocrate"),
  candidate(2012, "jean-luc-melenchon", "Jean-Luc Mélenchon", "Front de gauche"),
  candidate(2012, "nicolas-dupont-aignan", "Nicolas Dupont-Aignan", "Debout la République"),
  candidate(2012, "philippe-poutou", "Philippe Poutou", "Nouveau Parti anticapitaliste"),
  candidate(2012, "nathalie-arthaud", "Nathalie Arthaud", "Lutte ouvrière"),
  candidate(2012, "jacques-cheminade", "Jacques Cheminade", "Solidarité et progrès"),
  candidate(2017, "nicolas-dupont-aignan", "Nicolas Dupont-Aignan", "Debout la France"),
  candidate(2017, "marine-le-pen", "Marine Le Pen", "Front national"),
  candidate(2017, "emmanuel-macron", "Emmanuel Macron", "En Marche !"),
  candidate(2017, "benoit-hamon", "Benoît Hamon", "Parti socialiste"),
  candidate(2017, "nathalie-arthaud", "Nathalie Arthaud", "Lutte ouvrière"),
  candidate(2017, "philippe-poutou", "Philippe Poutou", "Nouveau Parti anticapitaliste"),
  candidate(2017, "jacques-cheminade", "Jacques Cheminade", "Solidarité et progrès"),
  candidate(2017, "jean-lassalle", "Jean Lassalle", "Résistons !"),
  candidate(2017, "jean-luc-melenchon", "Jean-Luc Mélenchon", "La France insoumise"),
  candidate(2017, "francois-asselineau", "François Asselineau", "Union populaire républicaine"),
  candidate(2017, "francois-fillon", "François Fillon", "Les Républicains"),
  candidate(2022, "nathalie-arthaud", "Nathalie Arthaud", "Lutte ouvrière"),
  candidate(2022, "nicolas-dupont-aignan", "Nicolas Dupont-Aignan", "Debout la France"),
  candidate(2022, "anne-hidalgo", "Anne Hidalgo", "Parti socialiste", "draft"),
  candidate(2022, "yannick-jadot", "Yannick Jadot", "Europe Écologie Les Verts", "draft"),
  candidate(2022, "jean-lassalle", "Jean Lassalle", "Résistons !"),
  candidate(2022, "marine-le-pen", "Marine Le Pen", "Rassemblement national", "draft"),
  candidate(2022, "emmanuel-macron", "Emmanuel Macron", "La République en marche", "draft"),
  candidate(2022, "jean-luc-melenchon", "Jean-Luc Mélenchon", "La France insoumise", "draft"),
  candidate(2022, "valerie-pecresse", "Valérie Pécresse", "Les Républicains", "draft"),
  candidate(2022, "philippe-poutou", "Philippe Poutou", "Nouveau Parti anticapitaliste"),
  candidate(2022, "fabien-roussel", "Fabien Roussel", "Parti communiste français", "draft"),
  candidate(2022, "eric-zemmour", "Éric Zemmour", "Reconquête !"),
];

const electionOutcome: Record<PresidentialElectionYear, Pick<PresidentialElectionRecord, "resultSource" | "secondRoundDate" | "electedCandidateId" | "mandate">> = {
  2012: {
    resultSource: officialResultSources[2012],
    secondRoundDate: { value: "2012-05-06", precision: "day" },
    electedCandidateId: "2012-francois-hollande",
    mandate: { start: { value: "2012", precision: "year" }, end: { value: "2017", precision: "year" }, status: "completed" },
  },
  2017: {
    resultSource: officialResultSources[2017],
    secondRoundDate: { value: "2017-05-07", precision: "day" },
    electedCandidateId: "2017-emmanuel-macron",
    mandate: { start: { value: "2017", precision: "year" }, end: { value: "2022", precision: "year" }, status: "completed" },
  },
  2022: {
    resultSource: officialResultSources[2022],
    secondRoundDate: { value: "2022-04-24", precision: "day" },
    electedCandidateId: "2022-emmanuel-macron",
    mandate: { start: { value: "2022", precision: "year" }, end: { value: "2027", precision: "year" }, status: "ongoing" },
  },
  2027: {
    resultSource: null,
    secondRoundDate: null,
    electedCandidateId: null,
    mandate: null,
  },
};

const election = (year: PresidentialElectionYear): PresidentialElectionRecord => ({
  year,
  label: localized(`Présidentielle ${year}`, `${year} presidential election`),
  candidateListStatus: year === 2027 ? "not_published" : "official_list",
  candidateListSource: officialListSources[year],
  ...electionOutcome[year],
  candidateIds: candidateRecords.filter((record) => record.electionYear === year).map((record) => record.id),
});

const pendingCommitmentSource = (year: PresidentialElectionYear, candidateName: string): PresidentialSource => sourceRef({
  type: year === 2022 ? "SOURCE_PRIMAIRE_OFFICIELLE" : "EN_ATTENTE_DE_PREUVE",
  status: "insufficient",
  name: year === 2022 ? localized(`CNCCEP — déclaration de ${candidateName}, point d’entrée à extraire`, `CNCCEP — ${candidateName}'s statement, entry point to extract`) : localized(`Document primaire de ${candidateName} à retrouver`, `Primary document for ${candidateName} to be found`),
  url: year === 2022 ? officialListSources[2022].url : null,
  documentNature: year === 2022 ? "profession_de_foi" : "unknown",
  version: year === 2022 ? "CNCCEP-2022-profession-de-foi-pending" : "primary-document-pending",
  publishedAt: UNKNOWN_DATE,
  note: localized("La formulation est une entrée de travail à rapprocher du document primaire ; elle ne constitue pas une mesure vérifiée.", "This wording is a working entry to be matched to the primary document; it is not a verified measure."),
});

type CommitmentInput = {
  id: string;
  electionYear: PresidentialElectionYear;
  candidateId: string;
  candidateName: string;
  partyOrCoalition: string;
  theme: LocalizedText;
  formulation: string;
  deadline?: PolicyDate;
  announcedUnits?: string | null;
  mechanism: string;
  source?: PresidentialSource;
  documentationStatus?: PresidentialCommitmentDocumentationStatus;
  limitations?: LocalizedText[];
  followUpStatus?: PresidentialCommitmentFollowUpStatus;
  deduplicationKey?: string;
  environmentalAssessment?: PresidentialEnvironmentalAssessment | null;
};

const hollandeSecondarySource = sourceRef({
  type: "SOURCE_SECONDAIRE",
  status: "insufficient",
  name: localized("Le Parisien — 60 engagements de François Hollande", "Le Parisien — François Hollande's 60 commitments"),
  url: "https://www.leparisien.fr/elections/presidentielle/les-60-engagements-pour-la-france-de-francois-hollande-26-01-2012-1830405.php",
  documentNature: "secondary_summary",
  version: "LEPARISIEN-2012-01-26",
  publishedAt: { value: "2012-01-26", precision: "day" },
  note: localized("Reproduction secondaire à confronter au programme original avant publication ; elle ne vaut pas approbation éditoriale.", "Secondary reproduction to be checked against the original programme before publication; it is not editorial approval."),
});

const sarkozySpeechSource = sourceRef({
  type: "DISCOURS_OFFICIEL",
  status: "needs_review",
  name: localized("Élysée — déclaration de Nicolas Sarkozy à Fessenheim", "Élysée — Nicolas Sarkozy's Fessenheim statement"),
  url: "https://www.elysee.fr/nicolas-sarkozy/2012/02/09/declaration-de-m-nicolas-sarkozy-president-de-la-republique-sur-la-surete-et-perennite-de-la-filiere-nucleaire-a-fessenheim-haut-rhin-le-9-fevrier-2012",
  documentNature: "speech",
  version: "ELYSEE-2012-02-09",
  publishedAt: { value: "2012-02-09", precision: "day" },
  note: localized("Discours institutionnel : il ne doit pas être présenté comme un programme écrit sans document complémentaire.", "Institutional speech: it must not be presented as a written programme without a complementary document."),
});

const melenchonProgramSource = sourceRef({
  type: "PRIMARY_PARTY_PROGRAM",
  status: "needs_review",
  name: localized("La France insoumise — L’Avenir en commun", "La France insoumise — L'Avenir en commun"),
  url: "https://lafranceinsoumise.fr/2016/10/18/dix-mesures-emblematiques-de-lavenir-commun/",
  documentNature: "programme",
  version: "LFI-2016-10-18",
  publishedAt: { value: "2016-10-18", precision: "day" },
  note: localized("Texte du mouvement daté du 18 octobre 2016 ; la formulation exacte de chaque mesure reste à valider individuellement.", "Movement text dated 18 October 2016; the exact wording of each measure still requires individual validation."),
});

const lePenArchivedProgramSource = sourceRef({
  type: "PRIMARY_ARCHIVED",
  status: "needs_review",
  name: localized("Projet présidentiel de Marine Le Pen — copie archivée par un tiers", "Marine Le Pen presidential project — third-party archived copy"),
  url: "https://www.connaissancedesenergies.org/sites/connaissancedesenergies.org/files/pdf-actualites/projet-presidentiel-marine-le-pen.pdf",
  documentNature: "programme",
  version: "MARINE-2017-PROJET-PRESIDENTIEL",
  publishedAt: UNKNOWN_DATE,
  note: localized("Copie primaire archivée hébergée par un tiers ; à recontrôler avant toute publication.", "Archived primary copy hosted by a third party; it must be rechecked before publication."),
});

const leMondeSecondarySource = sourceRef({
  type: "SOURCE_SECONDAIRE",
  status: "insufficient",
  name: localized("Le Monde — synthèse des programmes de 2017", "Le Monde — 2017 programme summary"),
  url: [
    "https://www.lemonde.fr/election-presidentielle-2017/article/2017/03/20/",
    "presidentielle-quels-sont-les-programmes-des-cinq-principaux-",
    "candidats_5097681_4854003.html",
  ].join(""),
  documentNature: "secondary_summary",
  version: "LEMONDE-2017-03-20",
  publishedAt: { value: "2017-03-20", precision: "day" },
  note: localized("Synthèse secondaire ; les programmes originaux doivent être inspectés avant toute approbation.", "Secondary summary; the original programmes must be inspected before any approval."),
});

const CNCCEP_PDFS_URL = "https://www.cnccep.fr/pdfs/";
const cnccpProfessionSource = (candidateName: string, fileName: string, page: number, version: string): PresidentialSource => sourceRef({
  type: "SOURCE_PRIMAIRE_OFFICIELLE",
  status: "verified",
  name: localized(`CNCCEP — profession de foi officielle de ${candidateName}`, `CNCCEP — ${candidateName}'s official statement`),
  url: `${CNCCEP_PDFS_URL}${fileName}`,
  documentNature: "profession_de_foi",
  version,
  publishedAt: UNKNOWN_DATE,
  page,
  checkedAt: COLLECTED_AT,
  note: localized(`PDF officiel CNCCEP, page ${page} ; la fiche reste en brouillon jusqu’à la revue éditoriale de l’attribution et de la formulation.`, `Official CNCCEP PDF, page ${page}; the record remains a draft until editorial review of attribution and wording.`),
});

const hidalgoSource = cnccpProfessionSource("Anne Hidalgo", "Candidat-03-Anne-Hidalgo-Declaration.pdf", 3, "CNCCEP-2022-03-HIDALGO");
const jadotSource = cnccpProfessionSource("Yannick Jadot", "Candidat-04-Yannick-Jadot-Declaration-accessible.pdf", 3, "CNCCEP-2022-04-JADOT");
const lePen2022Source = cnccpProfessionSource("Marine Le Pen", "Candidat-06-Marine-Le-Pen-Declaration-accessible.pdf", 2, "CNCCEP-2022-06-LE-PEN");
const macronSource = cnccpProfessionSource("Emmanuel Macron", "Candidat-07-Emmanuel-Macron-Declaration.pdf", 2, "CNCCEP-2022-07-MACRON");
const melenchon2022Source = cnccpProfessionSource("Jean-Luc Mélenchon", "Candidat-08-Jean-Luc-Melenchon-Declaration-accessible.pdf", 3, "CNCCEP-2022-08-MELENCHON");
const pecresseSource = cnccpProfessionSource("Valérie Pécresse", "Candidat-09-Valerie-Pecresse-Declaration-accessible.pdf", 3, "CNCCEP-2022-09-PECRESSE");
const rousselSource = cnccpProfessionSource("Fabien Roussel", "Candidat-11-Fabien-Roussel-Declaration-accessible.pdf", 2, "CNCCEP-2022-11-ROUSSEL");

const commitmentSources: Record<string, PresidentialSource> = {
  "2012-francois-hollande-nuclear-share": hollandeSecondarySource,
  "2012-francois-hollande-fessenheim": hollandeSecondarySource,
  "2012-francois-hollande-climate-border": hollandeSecondarySource,
  "2012-nicolas-sarkozy-fessenheim": sarkozySpeechSource,
  "2017-jean-luc-melenchon-green-rule": melenchonProgramSource,
  "2017-jean-luc-melenchon-renewables": melenchonProgramSource,
  "2017-marine-le-pen-wind-moratorium": lePenArchivedProgramSource,
  "2017-marine-le-pen-nuclear": lePenArchivedProgramSource,
  "2017-emmanuel-macron-electricity-mix": leMondeSecondarySource,
  "2017-benoit-hamon-diesel": leMondeSecondarySource,
  "2017-benoit-hamon-nuclear": leMondeSecondarySource,
  "2017-francois-fillon-carbon-price": leMondeSecondarySource,
  "2022-anne-hidalgo-renewables": hidalgoSource,
  "2022-anne-hidalgo-renovation": hidalgoSource,
  "2022-yannick-jadot-plastics": jadotSource,
  "2022-yannick-jadot-glyphosate": jadotSource,
  "2022-yannick-jadot-transport": jadotSource,
  "2022-marine-le-pen-energy-taxation": lePen2022Source,
  "2022-emmanuel-macron-nuclear": macronSource,
  "2022-emmanuel-macron-renewables": macronSource,
  "2022-emmanuel-macron-carbon-border": macronSource,
  "2022-jean-luc-melenchon-renewables": melenchon2022Source,
  "2022-jean-luc-melenchon-nuclear-exit": melenchon2022Source,
  "2022-jean-luc-melenchon-glyphosate": melenchon2022Source,
  "2022-valerie-pecresse-carbon-neutrality": pecresseSource,
  "2022-fabien-roussel-rail": rousselSource,
  "2022-fabien-roussel-public-transit": rousselSource,
  "2022-fabien-roussel-renovation": rousselSource,
};

const commitment = (input: CommitmentInput): PresidentialEnvironmentalCommitment => {
  const source = input.source ?? commitmentSources[input.id] ?? pendingCommitmentSource(input.electionYear, input.candidateName);
  const status: PresidentialCommitmentDocumentationStatus = input.documentationStatus ?? "source_insufficient";
  return {
    id: input.id,
    electionYear: input.electionYear,
    candidateId: `${input.electionYear}-${input.candidateId}`,
    candidateName: localized(input.candidateName),
    partyOrCoalition: input.partyOrCoalition,
    theme: input.theme,
    formulationAttributed: localized(input.formulation, `Working attribution to verify: ${input.formulation}`),
    source,
    deadline: input.deadline ?? UNKNOWN_DATE,
    announcedUnits: input.announcedUnits ?? null,
    mechanism: localized(`${input.mechanism} Formulation à vérifier individuellement.`, `${input.mechanism} Wording requires individual verification.`),
    limitations: input.limitations ?? [localized("La source primaire et la formulation exacte ne sont pas encore contrôlées ; aucune conclusion sur l’effet environnemental n’est produite.", "The primary source and exact wording have not been checked; no environmental conclusion is produced.")],
    followUpStatus: input.followUpStatus ?? "not_documented",
    firstCollectedAt: COLLECTED_AT,
    lastCheckedAt: null,
    documentationStatus: status,
    versions: [{ id: `${input.id}-initial`, recordedAt: COLLECTED_AT, sourceVersion: source.version, changeNote: localized("Entrée initiale issue du corpus de préparation ; elle reste à vérifier.", "Initial entry from the preparation corpus; it remains to be checked.") }],
    history: [{ id: `${input.id}-first-collected`, recordedAt: COLLECTED_AT, action: "first_collected", sourceVersion: source.version, note: localized("Collecte préparatoire sans validation humaine de la mesure.", "Preparation collection without human validation of the measure.") }],
    deduplicationKey: input.deduplicationKey ?? input.id,
    environmentalAssessment: input.environmentalAssessment ?? null,
    validation: validationDraft(`${input.id}-validation`, source, localized(`Engagement attribué à ${input.candidateName} à vérifier individuellement : ${input.formulation}`, `Commitment attributed to ${input.candidateName} to be checked individually: ${input.formulation}`)),
  };
};

const commitmentRecords: PresidentialEnvironmentalCommitment[] = [
  commitment({ id: "2012-francois-hollande-nuclear-share", electionYear: 2012, candidateId: "francois-hollande", candidateName: "François Hollande", partyOrCoalition: "Parti socialiste", theme: localized("Énergie et climat", "Energy and climate"), formulation: "Porter la part du nucléaire à 50 % en 2025.", deadline: { value: "2025", precision: "year" }, announcedUnits: "part du nucléaire : 50 %", mechanism: "Évolution du mix électrique", }),
  commitment({ id: "2012-francois-hollande-fessenheim", electionYear: 2012, candidateId: "francois-hollande", candidateName: "François Hollande", partyOrCoalition: "Parti socialiste", theme: localized("Énergie", "Energy"), formulation: "Position sur la centrale de Fessenheim.", mechanism: "Décision concernant une installation nucléaire", }),
  commitment({ id: "2012-francois-hollande-climate-border", electionYear: 2012, candidateId: "francois-hollande", candidateName: "François Hollande", partyOrCoalition: "Parti socialiste", theme: localized("Climat et commerce", "Climate and trade"), formulation: "Contribution climat-énergie aux frontières européennes.", mechanism: "Signal-prix appliqué aux échanges extérieurs", }),
  commitment({ id: "2012-nicolas-sarkozy-fessenheim", electionYear: 2012, candidateId: "nicolas-sarkozy", candidateName: "Nicolas Sarkozy", partyOrCoalition: "Union pour un mouvement populaire", theme: localized("Énergie", "Energy"), formulation: "Position sur Fessenheim.", mechanism: "Position sur la durée d’exploitation d’une centrale", }),
  commitment({ id: "2012-eva-joly-nuclear-exit", electionYear: 2012, candidateId: "eva-joly", candidateName: "Eva Joly", partyOrCoalition: "Europe Écologie Les Verts", theme: localized("Énergie et climat", "Energy and climate"), formulation: "Sortie du nucléaire sur 20 ans.", announcedUnits: "durée annoncée : 20 ans", mechanism: "Remplacement progressif de capacités nucléaires", }),

  commitment({ id: "2017-jean-luc-melenchon-green-rule", electionYear: 2017, candidateId: "jean-luc-melenchon", candidateName: "Jean-Luc Mélenchon", partyOrCoalition: "La France insoumise", theme: localized("Ressources et climat", "Resources and climate"), formulation: "Règle verte.", mechanism: "Contrainte de soutenabilité appliquée aux décisions publiques", }),
  commitment({ id: "2017-jean-luc-melenchon-renewables", electionYear: 2017, candidateId: "jean-luc-melenchon", candidateName: "Jean-Luc Mélenchon", partyOrCoalition: "La France insoumise", theme: localized("Énergie", "Energy"), formulation: "Transition vers les énergies renouvelables et sortie du nucléaire.", mechanism: "Transformation du mix énergétique", }),
  commitment({ id: "2017-marine-le-pen-wind-moratorium", electionYear: 2017, candidateId: "marine-le-pen", candidateName: "Marine Le Pen", partyOrCoalition: "Front national", theme: localized("Énergie et aménagement", "Energy and planning"), formulation: "Moratoire sur l’éolien.", mechanism: "Suspension de nouvelles installations éoliennes", }),
  commitment({ id: "2017-marine-le-pen-nuclear", electionYear: 2017, candidateId: "marine-le-pen", candidateName: "Marine Le Pen", partyOrCoalition: "Front national", theme: localized("Énergie", "Energy"), formulation: "Position en faveur de la filière nucléaire.", mechanism: "Maintien ou développement d’une filière énergétique", }),
  commitment({ id: "2017-emmanuel-macron-electricity-mix", electionYear: 2017, candidateId: "emmanuel-macron", candidateName: "Emmanuel Macron", partyOrCoalition: "En Marche !", theme: localized("Énergie et climat", "Energy and climate"), formulation: "Engagements sur le mix électrique et le charbon.", mechanism: "Évolution du mix électrique et fermeture de capacités charbon", }),
  commitment({ id: "2017-benoit-hamon-diesel", electionYear: 2017, candidateId: "benoit-hamon", candidateName: "Benoît Hamon", partyOrCoalition: "Parti socialiste", theme: localized("Mobilité et qualité de l’air", "Mobility and air quality"), formulation: "Mesures concernant le diesel.", mechanism: "Fiscalité ou réglementation des motorisations", }),
  commitment({ id: "2017-benoit-hamon-nuclear", electionYear: 2017, candidateId: "benoit-hamon", candidateName: "Benoît Hamon", partyOrCoalition: "Parti socialiste", theme: localized("Énergie", "Energy"), formulation: "Position sur le nucléaire.", mechanism: "Évolution du mix énergétique", }),
  commitment({ id: "2017-francois-fillon-carbon-price", electionYear: 2017, candidateId: "francois-fillon", candidateName: "François Fillon", partyOrCoalition: "Les Républicains", theme: localized("Climat et fiscalité", "Climate and taxation"), formulation: "Prix plancher du carbone.", mechanism: "Signal-prix sur les émissions de carbone", }),

  commitment({ id: "2022-anne-hidalgo-renewables", electionYear: 2022, candidateId: "anne-hidalgo", candidateName: "Anne Hidalgo", partyOrCoalition: "Parti socialiste", theme: localized("Énergie", "Energy"), formulation: "Atteindre 100 % d’énergies renouvelables dès que possible.", announcedUnits: "100 % d’énergies renouvelables", mechanism: "Transformation du mix énergétique", documentationStatus: "draft" }),
  commitment({ id: "2022-anne-hidalgo-renovation", electionYear: 2022, candidateId: "anne-hidalgo", candidateName: "Anne Hidalgo", partyOrCoalition: "Parti socialiste", theme: localized("Bâtiments", "Buildings"), formulation: "Permettre la rénovation énergétique des logements sans avance de frais.", mechanism: "Financement de la rénovation énergétique", documentationStatus: "draft" }),
  commitment({ id: "2022-yannick-jadot-glyphosate", electionYear: 2022, candidateId: "yannick-jadot", candidateName: "Yannick Jadot", partyOrCoalition: "Europe Écologie Les Verts", theme: localized("Agriculture et biodiversité", "Agriculture and biodiversity"), formulation: "Interdiction immédiate du glyphosate.", mechanism: "Interdiction d’un intrant agricole", documentationStatus: "draft" }),
  commitment({ id: "2022-yannick-jadot-plastics", electionYear: 2022, candidateId: "yannick-jadot", candidateName: "Yannick Jadot", partyOrCoalition: "Europe Écologie Les Verts", theme: localized("Déchets et ressources", "Waste and resources"), formulation: "Fin des plastiques à usage unique.", mechanism: "Interdiction ou réduction des usages de plastique", documentationStatus: "draft" }),
  commitment({ id: "2022-yannick-jadot-transport", electionYear: 2022, candidateId: "yannick-jadot", candidateName: "Yannick Jadot", partyOrCoalition: "Europe Écologie Les Verts", theme: localized("Mobilité et fiscalité", "Mobility and taxation"), formulation: "TVA à 5,5 % sur les transports collectifs.", announcedUnits: "TVA : 5,5 %", mechanism: "Fiscalité appliquée aux transports collectifs", documentationStatus: "draft" }),
  commitment({ id: "2022-marine-le-pen-energy-taxation", electionYear: 2022, candidateId: "marine-le-pen", candidateName: "Marine Le Pen", partyOrCoalition: "Rassemblement national", theme: localized("Énergie et fiscalité", "Energy and taxation"), formulation: "Réduction des taxes sur les carburants et l’énergie.", mechanism: "Modification des prélèvements sur l’énergie", limitations: [localized("La mesure est formulée dans un objectif de pouvoir d’achat ; aucun effet environnemental net n’est conclu.", "The measure is framed as a purchasing-power objective; no net environmental effect is concluded.")], documentationStatus: "draft" }),
  commitment({ id: "2022-emmanuel-macron-nuclear", electionYear: 2022, candidateId: "emmanuel-macron", candidateName: "Emmanuel Macron", partyOrCoalition: "La République en marche", theme: localized("Énergie", "Energy"), formulation: "Investir dans les énergies renouvelables et le nucléaire.", mechanism: "Investissement dans les capacités énergétiques", documentationStatus: "draft" }),
  commitment({ id: "2022-emmanuel-macron-renewables", electionYear: 2022, candidateId: "emmanuel-macron", candidateName: "Emmanuel Macron", partyOrCoalition: "La République en marche", theme: localized("Mobilité et énergie", "Mobility and energy"), formulation: "Investir dans les batteries et les véhicules électriques.", mechanism: "Investissement dans les technologies et véhicules électriques", documentationStatus: "draft" }),
  commitment({ id: "2022-emmanuel-macron-carbon-border", electionYear: 2022, candidateId: "emmanuel-macron", candidateName: "Emmanuel Macron", partyOrCoalition: "La République en marche", theme: localized("Climat et commerce", "Climate and trade"), formulation: "Mettre en place une taxe carbone écologique aux frontières de l’Europe.", mechanism: "Signal-prix appliqué aux échanges extérieurs", documentationStatus: "draft" }),
  commitment({ id: "2022-jean-luc-melenchon-renewables", electionYear: 2022, candidateId: "jean-luc-melenchon", candidateName: "Jean-Luc Mélenchon", partyOrCoalition: "La France insoumise", theme: localized("Énergie", "Energy"), formulation: "Choisir 100 % d’énergies renouvelables dès 2050.", deadline: { value: "2050", precision: "year" }, announcedUnits: "100 % d’énergies renouvelables", mechanism: "Transformation du mix énergétique", documentationStatus: "draft" }),
  commitment({ id: "2022-jean-luc-melenchon-nuclear-exit", electionYear: 2022, candidateId: "jean-luc-melenchon", candidateName: "Jean-Luc Mélenchon", partyOrCoalition: "La France insoumise", theme: localized("Énergie", "Energy"), formulation: "Sortir du nucléaire.", mechanism: "Évolution du parc de production électrique", documentationStatus: "draft" }),
  commitment({ id: "2022-jean-luc-melenchon-glyphosate", electionYear: 2022, candidateId: "jean-luc-melenchon", candidateName: "Jean-Luc Mélenchon", partyOrCoalition: "La France insoumise", theme: localized("Agriculture et biodiversité", "Agriculture and biodiversity"), formulation: "Interdiction du glyphosate.", mechanism: "Interdiction d’un intrant agricole", documentationStatus: "draft" }),
  commitment({ id: "2022-valerie-pecresse-carbon-neutrality", electionYear: 2022, candidateId: "valerie-pecresse", candidateName: "Valérie Pécresse", partyOrCoalition: "Les Républicains", theme: localized("Climat", "Climate"), formulation: "Respecter une trajectoire zéro carbone à l’horizon 2050 grâce à une ambition énergétique nucléaire et renouvelable.", deadline: { value: "2050", precision: "year" }, announcedUnits: "zéro carbone à l’horizon 2050", mechanism: "Réduction des émissions par un mix nucléaire et renouvelable", documentationStatus: "draft" }),
  commitment({ id: "2022-fabien-roussel-rail", electionYear: 2022, candidateId: "fabien-roussel", candidateName: "Fabien Roussel", partyOrCoalition: "Parti communiste français", theme: localized("Transports", "Transport"), formulation: "Réouverture des petites lignes SNCF.", mechanism: "Report modal vers le transport ferroviaire", documentationStatus: "draft" }),
  commitment({ id: "2022-fabien-roussel-public-transit", electionYear: 2022, candidateId: "fabien-roussel", candidateName: "Fabien Roussel", partyOrCoalition: "Parti communiste français", theme: localized("Transports", "Transport"), formulation: "Gratuité des transports publics urbains.", mechanism: "Accès tarifaire aux transports collectifs", documentationStatus: "draft" }),
  commitment({ id: "2022-fabien-roussel-renovation", electionYear: 2022, candidateId: "fabien-roussel", candidateName: "Fabien Roussel", partyOrCoalition: "Parti communiste français", theme: localized("Bâtiments", "Buildings"), formulation: "Rénovation thermique de 700 000 logements.", announcedUnits: "700 000 logements ; fréquence annuelle non explicitée dans l’extrait contrôlé", mechanism: "Réduction de la demande énergétique des bâtiments", limitations: [localized("Le PDF CNCCEP consulté mentionne 700 000 logements sans préciser une fréquence annuelle ; aucune cadence supplémentaire n’est déduite.", "The consulted CNCCEP PDF mentions 700,000 homes without specifying an annual frequency; no additional cadence is inferred.")], documentationStatus: "draft" }),
];

export const PRESIDENTIAL_ENVIRONMENTAL_CORPUS: PresidentialEnvironmentalCorpus = {
  elections: ([2012, 2017, 2022, 2027] as PresidentialElectionYear[]).map(election),
  candidates: candidateRecords,
  commitments: commitmentRecords,
};

export function getPresidentialElection(year: PresidentialElectionYear, corpus = PRESIDENTIAL_ENVIRONMENTAL_CORPUS): PresidentialElectionRecord | undefined {
  return corpus.elections.find((electionRecord) => electionRecord.year === year);
}

export function getPresidentialCandidates(year: PresidentialElectionYear, corpus = PRESIDENTIAL_ENVIRONMENTAL_CORPUS): PresidentialCandidateRecord[] {
  return corpus.candidates.filter((candidateRecord) => candidateRecord.electionYear === year);
}

export function getPresidentialCommitments(year?: PresidentialElectionYear, corpus = PRESIDENTIAL_ENVIRONMENTAL_CORPUS): PresidentialEnvironmentalCommitment[] {
  return corpus.commitments.filter((commitmentRecord) => year === undefined || commitmentRecord.electionYear === year);
}

export function getValidatedPresidentialCommitments(corpus = PRESIDENTIAL_ENVIRONMENTAL_CORPUS): PresidentialEnvironmentalCommitment[] {
  const validated = corpus.commitments.filter((commitmentRecord) => {
    try {
      assertPublishedContent(commitmentRecord.validation);
      return commitmentRecord.documentationStatus === "validated"
        && commitmentRecord.source.status === "verified"
        && Boolean(commitmentRecord.source.url)
        && isValidPolicyDate(commitmentRecord.deadline)
        && Boolean(commitmentRecord.lastCheckedAt)
        && isCompleteEnvironmentalAssessment(commitmentRecord.environmentalAssessment);
    } catch {
      return false;
    }
  });
  const keyCounts = new Map<string, number>();
  for (const commitmentRecord of validated) keyCounts.set(commitmentRecord.deduplicationKey, (keyCounts.get(commitmentRecord.deduplicationKey) ?? 0) + 1);
  return validated.filter((commitmentRecord) => keyCounts.get(commitmentRecord.deduplicationKey) === 1);
}

const isNonEmptyLocalizedText = (value: LocalizedText): boolean => Boolean(value.fr.trim() && value.en.trim());

function isCompleteEnvironmentalAssessment(assessment: PresidentialEnvironmentalAssessment | null): boolean {
  if (!assessment || !PRESIDENTIAL_ENVIRONMENTAL_CLASSIFICATIONS.includes(assessment.overallClassification) || !isValidPolicyDate({ value: assessment.reviewedAt, precision: "day" }) || !assessment.reviewedBy.trim() || !isNonEmptyLocalizedText(assessment.intent) || !isNonEmptyLocalizedText(assessment.expectedEffect)) return false;
  if (assessment.observedEffect !== null && !isNonEmptyLocalizedText(assessment.observedEffect)) return false;
  if (!PRESIDENTIAL_ENVIRONMENTAL_DOMAINS.every((domain) => assessment.domains[domain])) return false;
  return PRESIDENTIAL_ENVIRONMENTAL_DOMAINS.every((domain) => {
    const domainAssessment = assessment.domains[domain];
    if (!domainAssessment || !PRESIDENTIAL_ENVIRONMENTAL_CLASSIFICATIONS.includes(domainAssessment.classification) || !isNonEmptyLocalizedText(domainAssessment.justification) || !isNonEmptyLocalizedText(domainAssessment.mechanism) || !isNonEmptyLocalizedText(domainAssessment.hypotheses) || !isNonEmptyLocalizedText(domainAssessment.limitations) || !isNonEmptyLocalizedText(domainAssessment.uncertainties)) return false;
    return ["SOURCE_PRIMAIRE_OFFICIELLE", "SOURCE_PRIMAIRE_ARCHIVEE", "PRIMARY_ARCHIVED", "PRIMARY_PARTY_PROGRAM"].includes(domainAssessment.source.type) && domainAssessment.source.status === "verified" && Boolean(domainAssessment.source.url) && Boolean(domainAssessment.source.version) && ["limited", "moderate", "strong"].includes(domainAssessment.evidenceLevel);
  });
}

export function getPublicPresidentialArchive(corpus = PRESIDENTIAL_ENVIRONMENTAL_CORPUS): PresidentialPublicArchive {
  return {
    elections: corpus.elections,
    candidates: corpus.candidates
      .filter((candidateRecord) => candidateRecord.status === "official")
      .map((candidateRecord) => {
        const publicCandidate = { ...candidateRecord };
        Reflect.deleteProperty(publicCandidate, "validation");
        return publicCandidate as PresidentialPublicCandidate;
      }),
    validatedCommitments: getValidatedPresidentialCommitments(corpus)
      .map((commitmentRecord) => {
        const publicCommitment = { ...commitmentRecord };
        Reflect.deleteProperty(publicCommitment, "validation");
        return publicCommitment as PresidentialPublicCommitment;
      }),
  };
}
