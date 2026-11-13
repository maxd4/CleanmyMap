import { assertPublishedContent, type ContentValidationRecord } from "@/lib/content/content-validation";
import type { LocalizedText, PolicyDate } from "./environmental-policy-registry";

export type PresidentialElectionYear = 2012 | 2017 | 2022 | 2027;
export type PresidentialCandidateStatus = "official" | "not_published";
export type PresidentialCandidateDocumentationStatus = "not_collected" | "reviewed_no_measure_identified" | "source_insufficient" | "validated";
export type PresidentialCommitmentDocumentationStatus = "not_collected" | "no_measure_identified_after_review" | "not_quantified" | "deadline_unspecified" | "source_insufficient" | "draft" | "validated";
export type PresidentialSourceType = "SOURCE_PRIMAIRE_OFFICIELLE" | "SOURCE_PRIMAIRE_ARCHIVEE" | "DISCOURS_OFFICIEL" | "SOURCE_SECONDAIRE" | "EN_ATTENTE_DE_PREUVE";
export type PresidentialSourceStatus = "verified" | "needs_review" | "insufficient" | "missing";
export type PresidentialDocumentNature = "candidate_list" | "programme" | "profession_de_foi" | "speech" | "proposal" | "secondary_summary" | "unknown";
export type PresidentialHistoryAction = "first_collected" | "substantive_amendment" | "withdrawn" | "rechecked";

export type PresidentialSource = {
  type: PresidentialSourceType;
  status: PresidentialSourceStatus;
  name: LocalizedText;
  url: string | null;
  documentNature: PresidentialDocumentNature;
  version: string;
  publishedAt: PolicyDate;
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
  firstCollectedAt: string;
  lastCheckedAt: string | null;
  documentationStatus: PresidentialCommitmentDocumentationStatus;
  versions: PresidentialCommitmentVersion[];
  history: PresidentialCommitmentHistoryEntry[];
  validation: ContentValidationRecord;
};

export type PresidentialEnvironmentalCorpus = {
  elections: PresidentialElectionRecord[];
  candidates: PresidentialCandidateRecord[];
  commitments: PresidentialEnvironmentalCommitment[];
};

const COLLECTED_AT = "2026-11-13";
const UNKNOWN_DATE: PolicyDate = { value: null, precision: "unknown" };

const localized = (fr: string, en = fr): LocalizedText => ({ fr, en });

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

const candidate = (electionYear: PresidentialElectionYear, id: string, frName: string, partyOrCoalition: string): PresidentialCandidateRecord => {
  const source = officialListSources[electionYear];
  return {
    id: `${electionYear}-${id}`,
    electionYear,
    name: localized(frName),
    partyOrCoalition,
    status: "official",
    documentationStatus: "not_collected",
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
  candidate(2012, "nicolas-dupont-aignan", "Nicolas Dupont-Aignan", "Debout la France"),
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
  candidate(2022, "anne-hidalgo", "Anne Hidalgo", "Parti socialiste"),
  candidate(2022, "yannick-jadot", "Yannick Jadot", "Europe Écologie Les Verts"),
  candidate(2022, "jean-lassalle", "Jean Lassalle", "Résistons !"),
  candidate(2022, "marine-le-pen", "Marine Le Pen", "Rassemblement national"),
  candidate(2022, "emmanuel-macron", "Emmanuel Macron", "La République en marche"),
  candidate(2022, "jean-luc-melenchon", "Jean-Luc Mélenchon", "La France insoumise"),
  candidate(2022, "valerie-pecresse", "Valérie Pécresse", "Les Républicains"),
  candidate(2022, "philippe-poutou", "Philippe Poutou", "Nouveau Parti anticapitaliste"),
  candidate(2022, "fabien-roussel", "Fabien Roussel", "Parti communiste français"),
  candidate(2022, "eric-zemmour", "Éric Zemmour", "Reconquête !"),
];

const election = (year: PresidentialElectionYear): PresidentialElectionRecord => ({
  year,
  label: localized(`Présidentielle ${year}`, `${year} presidential election`),
  candidateListStatus: year === 2027 ? "not_published" : "official_list",
  candidateListSource: officialListSources[year],
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
};

const commitment = (input: CommitmentInput): PresidentialEnvironmentalCommitment => {
  const source = pendingCommitmentSource(input.electionYear, input.candidateName);
  const status: PresidentialCommitmentDocumentationStatus = "source_insufficient";
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
    limitations: [localized("La source primaire et la formulation exacte ne sont pas encore contrôlées ; aucune conclusion sur l’effet environnemental n’est produite.", "The primary source and exact wording have not been checked; no environmental conclusion is produced.")],
    firstCollectedAt: COLLECTED_AT,
    lastCheckedAt: null,
    documentationStatus: status,
    versions: [{ id: `${input.id}-initial`, recordedAt: COLLECTED_AT, sourceVersion: source.version, changeNote: localized("Entrée initiale issue du corpus de préparation ; elle reste à vérifier.", "Initial entry from the preparation corpus; it remains to be checked.") }],
    history: [{ id: `${input.id}-first-collected`, recordedAt: COLLECTED_AT, action: "first_collected", sourceVersion: source.version, note: localized("Collecte préparatoire sans validation humaine de la mesure.", "Preparation collection without human validation of the measure.") }],
    validation: validationDraft(`${input.id}-validation`, source, localized(`Engagement attribué à ${input.candidateName} à vérifier individuellement : ${input.formulation}`, `Commitment attributed to ${input.candidateName} to be checked individually: ${input.formulation}`)),
  };
};

const commitmentRecords: PresidentialEnvironmentalCommitment[] = [
  commitment({ id: "2012-francois-hollande-nuclear-share", electionYear: 2012, candidateId: "francois-hollande", candidateName: "François Hollande", partyOrCoalition: "Parti socialiste", theme: localized("Énergie et climat", "Energy and climate"), formulation: "Porter la part du nucléaire à 50 % en 2025.", deadline: { value: "2025", precision: "year" }, announcedUnits: "part du nucléaire : 50 %", mechanism: "Évolution du mix électrique", }),
  commitment({ id: "2012-francois-hollande-fessenheim", electionYear: 2012, candidateId: "francois-hollande", candidateName: "François Hollande", partyOrCoalition: "Parti socialiste", theme: localized("Énergie", "Energy"), formulation: "Position sur la centrale de Fessenheim.", mechanism: "Décision concernant une installation nucléaire", }),
  commitment({ id: "2012-francois-hollande-climate-border", electionYear: 2012, candidateId: "francois-hollande", candidateName: "François Hollande", partyOrCoalition: "Parti socialiste", theme: localized("Climat et commerce", "Climate and trade"), formulation: "Contribution climat-énergie aux frontières européennes.", mechanism: "Signal-prix appliqué aux échanges extérieurs", }),
  commitment({ id: "2012-nicolas-sarkozy-fessenheim", electionYear: 2012, candidateId: "nicolas-sarkozy", candidateName: "Nicolas Sarkozy", partyOrCoalition: "Union pour un mouvement populaire", theme: localized("Énergie", "Energy"), formulation: "Position sur Fessenheim.", mechanism: "Position sur la durée d’exploitation d’une centrale", }),
  commitment({ id: "2012-eva-joly-nuclear-exit", electionYear: 2012, candidateId: "eva-joly", candidateName: "Eva Joly", partyOrCoalition: "Europe Écologie Les Verts", theme: localized("Énergie et climat", "Energy and climate"), formulation: "Sortie du nucléaire sur 20 ans.", deadline: { value: "20", precision: "year" }, announcedUnits: "durée annoncée : 20 ans", mechanism: "Remplacement progressif de capacités nucléaires", }),

  commitment({ id: "2017-jean-luc-melenchon-green-rule", electionYear: 2017, candidateId: "jean-luc-melenchon", candidateName: "Jean-Luc Mélenchon", partyOrCoalition: "La France insoumise", theme: localized("Ressources et climat", "Resources and climate"), formulation: "Règle verte.", mechanism: "Contrainte de soutenabilité appliquée aux décisions publiques", }),
  commitment({ id: "2017-jean-luc-melenchon-renewables", electionYear: 2017, candidateId: "jean-luc-melenchon", candidateName: "Jean-Luc Mélenchon", partyOrCoalition: "La France insoumise", theme: localized("Énergie", "Energy"), formulation: "Transition vers les énergies renouvelables et sortie du nucléaire.", mechanism: "Transformation du mix énergétique", }),
  commitment({ id: "2017-marine-le-pen-wind-moratorium", electionYear: 2017, candidateId: "marine-le-pen", candidateName: "Marine Le Pen", partyOrCoalition: "Front national", theme: localized("Énergie et aménagement", "Energy and planning"), formulation: "Moratoire sur l’éolien.", mechanism: "Suspension de nouvelles installations éoliennes", }),
  commitment({ id: "2017-marine-le-pen-nuclear", electionYear: 2017, candidateId: "marine-le-pen", candidateName: "Marine Le Pen", partyOrCoalition: "Front national", theme: localized("Énergie", "Energy"), formulation: "Position en faveur de la filière nucléaire.", mechanism: "Maintien ou développement d’une filière énergétique", }),
  commitment({ id: "2017-emmanuel-macron-electricity-mix", electionYear: 2017, candidateId: "emmanuel-macron", candidateName: "Emmanuel Macron", partyOrCoalition: "En Marche !", theme: localized("Énergie et climat", "Energy and climate"), formulation: "Engagements sur le mix électrique et le charbon.", mechanism: "Évolution du mix électrique et fermeture de capacités charbon", }),
  commitment({ id: "2017-benoit-hamon-diesel", electionYear: 2017, candidateId: "benoit-hamon", candidateName: "Benoît Hamon", partyOrCoalition: "Parti socialiste", theme: localized("Mobilité et qualité de l’air", "Mobility and air quality"), formulation: "Mesures concernant le diesel.", mechanism: "Fiscalité ou réglementation des motorisations", }),
  commitment({ id: "2017-benoit-hamon-nuclear", electionYear: 2017, candidateId: "benoit-hamon", candidateName: "Benoît Hamon", partyOrCoalition: "Parti socialiste", theme: localized("Énergie", "Energy"), formulation: "Position sur le nucléaire.", mechanism: "Évolution du mix énergétique", }),
  commitment({ id: "2017-francois-fillon-carbon-price", electionYear: 2017, candidateId: "francois-fillon", candidateName: "François Fillon", partyOrCoalition: "Les Républicains", theme: localized("Climat et fiscalité", "Climate and taxation"), formulation: "Prix plancher du carbone.", mechanism: "Signal-prix sur les émissions de carbone", }),

  commitment({ id: "2022-anne-hidalgo-renewables", electionYear: 2022, candidateId: "anne-hidalgo", candidateName: "Anne Hidalgo", partyOrCoalition: "Parti socialiste", theme: localized("Énergie", "Energy"), formulation: "Développement des énergies renouvelables.", mechanism: "Transformation du mix énergétique", }),
  commitment({ id: "2022-anne-hidalgo-renovation", electionYear: 2022, candidateId: "anne-hidalgo", candidateName: "Anne Hidalgo", partyOrCoalition: "Parti socialiste", theme: localized("Bâtiments", "Buildings"), formulation: "Rénovation énergétique.", mechanism: "Réduction de la demande énergétique des bâtiments", }),
  commitment({ id: "2022-yannick-jadot-glyphosate", electionYear: 2022, candidateId: "yannick-jadot", candidateName: "Yannick Jadot", partyOrCoalition: "Europe Écologie Les Verts", theme: localized("Agriculture et biodiversité", "Agriculture and biodiversity"), formulation: "Sortie du glyphosate.", mechanism: "Restriction d’un intrant agricole", }),
  commitment({ id: "2022-yannick-jadot-plastics", electionYear: 2022, candidateId: "yannick-jadot", candidateName: "Yannick Jadot", partyOrCoalition: "Europe Écologie Les Verts", theme: localized("Déchets et ressources", "Waste and resources"), formulation: "Mesures sur les plastiques.", mechanism: "Prévention, réduction ou transformation des usages de plastique", }),
  commitment({ id: "2022-yannick-jadot-transport", electionYear: 2022, candidateId: "yannick-jadot", candidateName: "Yannick Jadot", partyOrCoalition: "Europe Écologie Les Verts", theme: localized("Transports", "Transport"), formulation: "Mesures sur les transports.", mechanism: "Report modal et évolution des mobilités", }),
  commitment({ id: "2022-marine-le-pen-energy-taxation", electionYear: 2022, candidateId: "marine-le-pen", candidateName: "Marine Le Pen", partyOrCoalition: "Rassemblement national", theme: localized("Énergie et fiscalité", "Energy and taxation"), formulation: "Fiscalité énergétique.", mechanism: "Modification des prélèvements sur l’énergie", }),
  commitment({ id: "2022-emmanuel-macron-nuclear", electionYear: 2022, candidateId: "emmanuel-macron", candidateName: "Emmanuel Macron", partyOrCoalition: "La République en marche", theme: localized("Énergie", "Energy"), formulation: "Engagements sur le nucléaire.", mechanism: "Évolution du parc et de la production nucléaire", }),
  commitment({ id: "2022-emmanuel-macron-renewables", electionYear: 2022, candidateId: "emmanuel-macron", candidateName: "Emmanuel Macron", partyOrCoalition: "La République en marche", theme: localized("Énergie", "Energy"), formulation: "Engagements sur les énergies renouvelables.", mechanism: "Développement de capacités renouvelables", }),
  commitment({ id: "2022-emmanuel-macron-carbon-border", electionYear: 2022, candidateId: "emmanuel-macron", candidateName: "Emmanuel Macron", partyOrCoalition: "La République en marche", theme: localized("Climat et commerce", "Climate and trade"), formulation: "Mécanisme carbone aux frontières.", mechanism: "Prise en compte du contenu carbone des importations", }),
  commitment({ id: "2022-jean-luc-melenchon-renewables", electionYear: 2022, candidateId: "jean-luc-melenchon", candidateName: "Jean-Luc Mélenchon", partyOrCoalition: "La France insoumise", theme: localized("Énergie", "Energy"), formulation: "Développement des énergies renouvelables.", mechanism: "Transformation du mix énergétique", }),
  commitment({ id: "2022-jean-luc-melenchon-glyphosate", electionYear: 2022, candidateId: "jean-luc-melenchon", candidateName: "Jean-Luc Mélenchon", partyOrCoalition: "La France insoumise", theme: localized("Agriculture et biodiversité", "Agriculture and biodiversity"), formulation: "Sortie du glyphosate.", mechanism: "Restriction d’un intrant agricole", }),
  commitment({ id: "2022-valerie-pecresse-carbon-neutrality", electionYear: 2022, candidateId: "valerie-pecresse", candidateName: "Valérie Pécresse", partyOrCoalition: "Les Républicains", theme: localized("Climat", "Climate"), formulation: "Neutralité carbone.", mechanism: "Réduction des émissions et compensation ou absorption résiduelle", }),
  commitment({ id: "2022-fabien-roussel-rail", electionYear: 2022, candidateId: "fabien-roussel", candidateName: "Fabien Roussel", partyOrCoalition: "Parti communiste français", theme: localized("Transports", "Transport"), formulation: "Développement du rail.", mechanism: "Report modal vers le transport ferroviaire", }),
  commitment({ id: "2022-fabien-roussel-renovation", electionYear: 2022, candidateId: "fabien-roussel", candidateName: "Fabien Roussel", partyOrCoalition: "Parti communiste français", theme: localized("Bâtiments", "Buildings"), formulation: "Rénovation énergétique.", mechanism: "Réduction de la demande énergétique des bâtiments", }),
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
  return corpus.commitments.filter((commitmentRecord) => {
    try {
      assertPublishedContent(commitmentRecord.validation);
      return commitmentRecord.documentationStatus === "validated"
        && commitmentRecord.source.status === "verified"
        && Boolean(commitmentRecord.source.url)
        && Boolean(commitmentRecord.lastCheckedAt);
    } catch {
      return false;
    }
  });
}
