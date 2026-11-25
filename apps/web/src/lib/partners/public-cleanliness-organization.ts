import { getArrondissementCityCount, getArrondissementCityOptions, type ArrondissementCity } from "@/lib/geo/paris-arrondissements";
import { INITIAL_ANNUAIRE_ENTRIES } from "@/components/sections/rubriques/annuaire/seed-index";
import { extendParisPublicCleanlinessDataset } from "./public-cleanliness-organization.paris-extension";
import { extendParisWasteChain } from "./public-cleanliness-chain.paris";
import { isPrivateOrUnauthorizedInviteUrl } from "./paris-cleanwalk-network.channels";

export type OrganizationNodeKind = "city" | "direction" | "service" | "unit" | "team" | "position" | "profession" | "person" | "provider";
export type OrganizationRelationKind = "hierarchy" | "coordination" | "programme" | "service" | "mandate" | "assignment" | "cooperation";
export type OrganizationAssignmentStatus = "confirmed" | "historical" | "unknown";

export type OrganizationSource = {
  id: string;
  label: string;
  url: string;
  sourceContentDate?: string;
  verifiedAt: string;
  evidence: "official_current" | "official_historical" | "official_job_profile" | "operator_statement" | "professional_self_statement";
};

export type OrganizationPublicContact = {
  label: string;
  url: string;
  kind: "official_portal" | "functional_contact";
  sourceIds: readonly string[];
};

export type PublicCleanlinessOrganizationNode = {
  id: string;
  name: string;
  kind: OrganizationNodeKind;
  searchTerms?: readonly string[];
  /** Existing directory identifier where this organization already has one. */
  directoryId?: string;
  /** Cross-reference to an existing public network actor, not another organization identity. */
  networkActorId?: string;
  /** Legal entity that employs this organization or role. */
  legalEmployerId?: string;
  /** Immediate organizational unit; must match one hierarchy edge. */
  unitId?: string;
  /** Optional mutually exclusive coverage set, such as territorial divisions. */
  territoryCoverageGroup?: string;
  coverageRole?: "local_mayor" | "local_delegation" | "local_dgs" | "local_dgaep" | "req";
  /** Public institutional channel, never an individual or recruitment contact. */
  publicContact?: OrganizationPublicContact;
  territoryIds: readonly string[];
  service: "governance" | "cleaning" | "collection" | "emergency" | "prevention" | "coordination" | "police" | "provider";
  assignment: OrganizationAssignmentStatus;
  description: string;
  sourceIds: readonly string[];
};

export type PublicCleanlinessOrganizationRelation = {
  id: string;
  from: string;
  to: string;
  kind: OrganizationRelationKind;
  status: OrganizationAssignmentStatus;
  /** Published validity dates when known; an award is not proof of execution. */
  validFrom?: string;
  validUntil?: string;
  sourceIds: readonly string[];
};

const BASE_PUBLIC_CLEANLINESS_SOURCES: readonly OrganizationSource[] = [
  { id: "paris-org-chart", label: "Organigramme de la Ville de Paris", url: "https://www.paris.fr/pages/organigramme-de-la-ville-de-paris-2380", sourceContentDate: "2026-09-09", verifiedAt: "2026-11-24", evidence: "official_current" },
  { id: "paris-cleanliness", label: "Propreté : comment la Ville de Paris entretient l'espace public", url: "https://www.paris.fr/pages/la-proprete-239/", sourceContentDate: "2026-09-16", verifiedAt: "2026-11-24", evidence: "official_current" },
  { id: "paris-collection", label: "La collecte des déchets ménagers", url: "https://www.paris.fr/pages/la-collecte-44", sourceContentDate: "2026-02-13", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "paris-directories", label: "Liste des directions de la Ville de Paris — Paris Data", url: "https://opendata.paris.fr/explore/dataset/liste-des-directions-de-la-ville-de-paris/", verifiedAt: "2026-11-24", evidence: "official_current" },
  { id: "req-20-recruitment", label: "Offre REQ du 20e — référence V02400-14932", url: "https://travaillerpourparis.offres.paris.fr/13375/1/referents-referentes-de-l-entretien-du-quartier-20eme-arrondissements-f-h", verifiedAt: "2026-11-24", evidence: "official_job_profile" },
  { id: "tson-17-recruitment", label: "Offre TSON — Division 17, référence V69121002-5188", url: "https://travaillerpourparis.offres.paris.fr/5521/1/technicien-technicienne-des-services-operationnels-de-nettoiement-tson-atelier-as-engins-apm-f", verifiedAt: "2026-11-24", evidence: "official_historical" },
  { id: "dgaep-19-recruitment", label: "Offre de DGAEP — mairie du 19e, référence V03688-17730", url: "https://travaillerpourparis.offres.paris.fr/15944/1/directeur-general-adjoint-des-services-en-charge-de-l-espace-public-a-la-mairie-du-19eme-f-h", verifiedAt: "2026-11-24", evidence: "official_job_profile" },
];

const ALL_PARIS_ARRONDISSEMENTS = Array.from({ length: 20 }, (_, index) => `Paris:${index + 1}`);
const source = (...ids: string[]) => ids;

const parisDivisions: { id: string; label: string; districts: number[] }[] = [
  { id: "division-01-04", label: "Division territoriale 1er–4e", districts: [1, 2, 3, 4] },
  { id: "division-05-06", label: "Division territoriale 5e–6e", districts: [5, 6] },
  { id: "division-07-08", label: "Division territoriale 7e–8e", districts: [7, 8] },
  { id: "division-09-10", label: "Division territoriale 9e–10e", districts: [9, 10] },
  ...Array.from({ length: 10 }, (_, index) => ({ id: `division-${String(index + 11).padStart(2, "0")}`, label: `Division territoriale ${index + 11}e`, districts: [index + 11] })),
];

const BASE_PARIS_PUBLIC_CLEANLINESS_NODES: readonly PublicCleanlinessOrganizationNode[] = [
  { id: "city-paris", name: "Ville de Paris", kind: "city", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "governance", assignment: "confirmed", description: "Collectivité territoriale ; périmètre général du référentiel parisien.", sourceIds: source("paris-org-chart", "paris-directories") },
  { id: "dpe", name: "Direction de la Propreté et de l'Eau (DPE)", kind: "direction", unitId: "city-paris", legalEmployerId: "city-paris", directoryId: "evt-paris-nettoyages", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "cleaning", assignment: "confirmed", description: "Direction responsable du nettoiement et de la collecte municipale selon les secteurs.", sourceIds: source("paris-cleanliness", "paris-collection") },
  { id: "stpp", name: "Service technique de la propreté de Paris (STPP)", kind: "service", unitId: "dpe", legalEmployerId: "city-paris", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "cleaning", assignment: "confirmed", description: "Service de la DPE chargé du nettoiement de la voie publique et de la collecte des déchets.", sourceIds: source("paris-cleanliness") },
  ...parisDivisions.map((division) => ({ id: division.id, name: division.label, kind: "unit" as const, legalEmployerId: "city-paris", unitId: "stpp", territoryCoverageGroup: "stpp-divisions", territoryIds: division.districts.map((district) => `Paris:${district}`), service: "cleaning" as const, assignment: "confirmed" as const, description: "Division de propreté desservant plusieurs arrondissements ou un arrondissement. Les rattachements locaux détaillés restent inconnus sauf preuve citée.", sourceIds: source("paris-cleanliness") })),
  { id: "brigade-urgence-proprete", name: "Brigades Urgence Propreté", kind: "team", unitId: "dpe", legalEmployerId: "city-paris", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "emergency", assignment: "confirmed", description: "Équipes mobiles déployées pour traiter des besoins ciblés signalés par les mairies et les habitants.", sourceIds: source("paris-cleanliness") },
  { id: "dpe-field-agents", name: "Agents de terrain — nettoiement et collecte", kind: "profession", unitId: "stpp", legalEmployerId: "city-paris", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "cleaning", assignment: "confirmed", description: "Représentation collective des agents ; aucun effectif ni identité individuelle n'est affiché dans ce référentiel.", sourceIds: source("paris-cleanliness") },
  { id: "tson-position", name: "Technicien·ne des services opérationnels de nettoiement (TSON)", kind: "position", unitId: "division-17", legalEmployerId: "city-paris", searchTerms: ["TSON"], territoryIds: ["Paris:17"], service: "cleaning", assignment: "historical", description: "Fiche de poste rattachée à la Division 17 ; elle décrit un poste et un encadrement d'équipe, pas un titulaire actuellement en poste.", sourceIds: source("tson-17-recruitment") },
  { id: "division-17-sectors", name: "Secteurs territoriaux et ateliers (structure décrite pour la Division 17)", kind: "unit", unitId: "division-17", legalEmployerId: "city-paris", territoryIds: ["Paris:17"], service: "cleaning", assignment: "historical", description: "La fiche de poste de 2025 décrit 3 secteurs territoriaux et 8 ateliers, plus un secteur fonctionnel avec 2 ateliers. Les titulaires ne sont pas renseignés.", sourceIds: source("tson-17-recruitment") },
  { id: "division-17-supervisors", name: "Responsables de division et de secteur (fonctions)", kind: "position", unitId: "division-17", legalEmployerId: "city-paris", territoryIds: ["Paris:17"], service: "cleaning", assignment: "historical", description: "La fiche de poste décrit une cheffe de division, deux adjoints et un chef de secteur ; ce sont des fonctions organisationnelles, sans identité ni affectation actuelle inférée.", sourceIds: source("tson-17-recruitment") },
  { id: "specialized-cleaning-services", name: "Services spécialisés de propreté", kind: "service", unitId: "stpp", legalEmployerId: "city-paris", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "cleaning", assignment: "confirmed", description: "La Ville documente des interventions particulières, dont voies souterraines et berges. Les unités et chaînes de rattachement détaillées ne sont pas toutes publiées ici.", sourceIds: source("paris-cleanliness") },
  { id: "eboueurs", name: "Éboueurs et éboueuses", kind: "profession", unitId: "stpp", legalEmployerId: "city-paris", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "cleaning", assignment: "confirmed", description: "Métier représenté collectivement, sans personnes ni effectifs inventés.", sourceIds: source("paris-cleanliness", "tson-17-recruitment") },
  { id: "collection-drivers", name: "Conducteurs et conductrices d'engins de collecte et nettoiement", kind: "profession", unitId: "stpp", legalEmployerId: "city-paris", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "collection", assignment: "confirmed", description: "Métier représenté collectivement ; affectations locales inconnues.", sourceIds: source("paris-cleanliness", "tson-17-recruitment") },
  { id: "ddct", name: "Direction de la Démocratie, des Citoyens et des Territoires (DDCT)", kind: "direction", unitId: "city-paris", legalEmployerId: "city-paris", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "coordination", assignment: "confirmed", description: "La DDCT a lancé le déploiement des REQ ; cela ne décrit pas à lui seul une ligne hiérarchique opérationnelle.", sourceIds: source("paris-org-chart", "req-20-recruitment") },
  { id: "borough-mayors", name: "Mairies d'arrondissement", kind: "unit", unitId: "city-paris", legalEmployerId: "city-paris", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "governance", assignment: "confirmed", description: "Échelon municipal local ; aucune affectation individuelle n'est inférée.", sourceIds: source("paris-org-chart", "req-20-recruitment") },
  { id: "dgaep", name: "Directions générales adjointes « Espace public » (DGAEP)", kind: "position", unitId: "borough-mayors", legalEmployerId: "city-paris", searchTerms: ["DGAEP"], territoryIds: ["Paris:20"], service: "coordination", assignment: "confirmed", description: "La fiche REQ du 20e indique un rattachement au DGAEP de la mairie d'arrondissement ; le titulaire n'est pas identifié ici.", sourceIds: source("req-20-recruitment") },
  { id: "dgs-19", name: "Direction générale des services (DGS) — mairie du 19e", kind: "service", unitId: "borough-mayors", legalEmployerId: "city-paris", territoryIds: ["Paris:19"], service: "governance", assignment: "confirmed", description: "La fiche de poste DGAEP décrit le DGS au sein de la direction générale des services de la mairie du 19e. Aucun nom de titulaire n'est repris.", sourceIds: source("dgaep-19-recruitment") },
  { id: "dgaep-19", name: "DGAEP — mairie du 19e", kind: "position", unitId: "dgs-19", legalEmployerId: "city-paris", territoryIds: ["Paris:19"], service: "coordination", assignment: "historical", description: "Poste décrit dans une offre datée de septembre 2026. L'offre ne prouve pas l'identité d'un titulaire en fonction.", sourceIds: source("dgaep-19-recruitment") },
  { id: "req", name: "Référents et référentes de l'entretien du quartier (REQ)", kind: "position", unitId: "dgaep", legalEmployerId: "city-paris", searchTerms: ["REQ"], territoryIds: ["Paris:20"], service: "coordination", assignment: "unknown", description: "Offre de poste localisée au 20e et dispositif en déploiement par la DDCT. Les affectations actuelles, quartiers desservis et titulaires ne sont pas établis par cette offre.", sourceIds: source("req-20-recruitment") },
  { id: "municipal-police", name: "Police municipale et prévention (DPMP)", kind: "direction", unitId: "city-paris", legalEmployerId: "city-paris", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "police", assignment: "confirmed", description: "Direction citée parmi les services que les REQ peuvent solliciter ; aucune chaîne de commandement partagée n'est représentée.", sourceIds: source("req-20-recruitment", "paris-org-chart") },
  { id: "prevention-sorting", name: "Prévention, sensibilisation et tri", kind: "service", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "prevention", assignment: "unknown", description: "Fonction publique documentée dans l'écosystème ; rattachement administratif des unités non établi dans les sources utilisées ici.", sourceIds: source("paris-org-chart") },
  { id: "syctom", name: "Syctom", kind: "provider", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "provider", assignment: "confirmed", description: "Syndicat de traitement des déchets ; relation de traitement, pas une ligne hiérarchique municipale.", sourceIds: source("paris-collection") },
  { id: "private-collectors", name: "Prestataires privés de collecte", kind: "provider", territoryIds: [], service: "provider", assignment: "confirmed", description: "La collecte municipale de certains arrondissements est réalisée par des entreprises privées. Les titulaires de marché et périmètres précis ne sont pas copiés ici.", sourceIds: source("paris-collection") },
];

const BASE_PARIS_PUBLIC_CLEANLINESS_RELATIONS: readonly PublicCleanlinessOrganizationRelation[] = [
  { id: "city-dpe", from: "city-paris", to: "dpe", kind: "hierarchy", status: "confirmed", sourceIds: source("paris-org-chart", "paris-directories") },
  { id: "dpe-stpp", from: "dpe", to: "stpp", kind: "hierarchy", status: "confirmed", sourceIds: source("paris-cleanliness") },
  ...parisDivisions.map(({ id }) => ({ id: `stpp-${id}`, from: "stpp", to: id, kind: "hierarchy" as const, status: "confirmed" as const, sourceIds: source("paris-cleanliness") })),
  { id: "dpe-urgence", from: "dpe", to: "brigade-urgence-proprete", kind: "hierarchy", status: "confirmed", sourceIds: source("paris-cleanliness") },
  { id: "stpp-agents", from: "stpp", to: "dpe-field-agents", kind: "hierarchy", status: "confirmed", sourceIds: source("paris-cleanliness") },
  { id: "stpp-eboueurs", from: "stpp", to: "eboueurs", kind: "hierarchy", status: "confirmed", sourceIds: source("paris-cleanliness", "tson-17-recruitment") },
  { id: "stpp-conductors", from: "stpp", to: "collection-drivers", kind: "hierarchy", status: "confirmed", sourceIds: source("paris-cleanliness", "tson-17-recruitment") },
  { id: "division17-supervisors", from: "division-17", to: "division-17-supervisors", kind: "hierarchy", status: "historical", sourceIds: source("tson-17-recruitment") },
  { id: "stpp-specialized-services", from: "stpp", to: "specialized-cleaning-services", kind: "hierarchy", status: "confirmed", sourceIds: source("paris-cleanliness") },
  { id: "division17-tson", from: "division-17", to: "tson-position", kind: "hierarchy", status: "historical", sourceIds: source("tson-17-recruitment") },
  { id: "division17-workshops", from: "division-17", to: "division-17-sectors", kind: "hierarchy", status: "historical", sourceIds: source("tson-17-recruitment") },
  { id: "tson-eboueurs", from: "tson-position", to: "eboueurs", kind: "coordination", status: "historical", sourceIds: source("tson-17-recruitment") },
  { id: "city-municipal-police", from: "city-paris", to: "municipal-police", kind: "hierarchy", status: "confirmed", sourceIds: source("paris-org-chart") },
  { id: "city-ddct", from: "city-paris", to: "ddct", kind: "hierarchy", status: "confirmed", sourceIds: source("paris-org-chart") },
  { id: "city-mayors", from: "city-paris", to: "borough-mayors", kind: "hierarchy", status: "confirmed", sourceIds: source("paris-org-chart") },
  { id: "mayors-dgaep", from: "borough-mayors", to: "dgaep", kind: "hierarchy", status: "confirmed", sourceIds: source("req-20-recruitment") },
  { id: "dgaep-req", from: "dgaep", to: "req", kind: "hierarchy", status: "confirmed", sourceIds: source("req-20-recruitment") },
  { id: "mayors-dgs19", from: "borough-mayors", to: "dgs-19", kind: "hierarchy", status: "confirmed", sourceIds: source("dgaep-19-recruitment") },
  { id: "dgs19-dgaep19", from: "dgs-19", to: "dgaep-19", kind: "hierarchy", status: "historical", sourceIds: source("dgaep-19-recruitment") },
  { id: "ddct-req-programme", from: "ddct", to: "req", kind: "programme", status: "confirmed", sourceIds: source("req-20-recruitment") },
  { id: "req-dpe-coordination", from: "req", to: "dpe", kind: "coordination", status: "confirmed", sourceIds: source("req-20-recruitment") },
  { id: "req-police-coordination", from: "req", to: "municipal-police", kind: "coordination", status: "confirmed", sourceIds: source("req-20-recruitment") },
  { id: "city-syctom", from: "city-paris", to: "syctom", kind: "service", status: "confirmed", sourceIds: source("paris-collection") },
  { id: "city-private-collectors", from: "city-paris", to: "private-collectors", kind: "service", status: "confirmed", sourceIds: source("paris-collection") },
];

export type PublicCleanlinessCityDataset = {
  city: ArrondissementCity;
  /** Canonical territorial identifiers covered by this city's source set. */
  territoryIds: readonly string[];
  nodes: readonly PublicCleanlinessOrganizationNode[];
  relations: readonly PublicCleanlinessOrganizationRelation[];
  sources: readonly OrganizationSource[];
  /** Groups that must partition every territory exactly once. */
  requiredCoverageGroups?: readonly string[];
};

const parisInstitutional = extendParisWasteChain(extendParisPublicCleanlinessDataset({
  nodes: BASE_PARIS_PUBLIC_CLEANLINESS_NODES,
  relations: BASE_PARIS_PUBLIC_CLEANLINESS_RELATIONS,
  sources: BASE_PUBLIC_CLEANLINESS_SOURCES,
}));
export const PARIS_PUBLIC_CLEANLINESS_NODES: readonly PublicCleanlinessOrganizationNode[] = parisInstitutional.nodes;
export const PARIS_PUBLIC_CLEANLINESS_RELATIONS: readonly PublicCleanlinessOrganizationRelation[] = parisInstitutional.relations;
export const PUBLIC_CLEANLINESS_SOURCES: readonly OrganizationSource[] = parisInstitutional.sources;

/** Add a city's documented registry entry here; filters and rendering are city-agnostic. */
export const PARIS_PUBLIC_CLEANLINESS_DATASET: PublicCleanlinessCityDataset = {
  city: "Paris",
  territoryIds: ALL_PARIS_ARRONDISSEMENTS,
  nodes: PARIS_PUBLIC_CLEANLINESS_NODES,
  relations: PARIS_PUBLIC_CLEANLINESS_RELATIONS,
  sources: PUBLIC_CLEANLINESS_SOURCES,
  requiredCoverageGroups: ["town-halls", "stpp-divisions", "dpmp-divisions"],
};

export type PublicCleanlinessCityDatasets = Partial<Record<ArrondissementCity, PublicCleanlinessCityDataset>>;

export const PUBLIC_CLEANLINESS_CITY_DATASETS: PublicCleanlinessCityDatasets = {
  Paris: PARIS_PUBLIC_CLEANLINESS_DATASET,
};

export function getPublicCleanlinessCityDataset(
  city: string,
  datasets: PublicCleanlinessCityDatasets = PUBLIC_CLEANLINESS_CITY_DATASETS,
): PublicCleanlinessCityDataset | null {
  return Object.prototype.hasOwnProperty.call(datasets, city)
    ? datasets[city as ArrondissementCity] ?? null
    : null;
}

export type PublicCleanlinessFilters = { city: string; arrondissement: number | null; service: PublicCleanlinessOrganizationNode["service"] | "all"; query: string };

/** Fail closed for public contact projections; only the explicitly sourced institutional channel is returned. */
export function getPublicCleanlinessContact(node: PublicCleanlinessOrganizationNode, sources: readonly OrganizationSource[]): OrganizationPublicContact | null {
  const contact = node.publicContact;
  if (!contact || node.kind === "person" || node.kind === "position" || node.kind === "profession" ||
      !contact.label.trim() || contact.label.includes("@") || !contact.sourceIds.length ||
      (contact.kind !== "functional_contact" && contact.kind !== "official_portal")) return null;
  try {
    const url = new URL(contact.url);
    if (url.protocol !== "https:" || url.username || url.password ||
        /offres|recrutement/i.test(url.hostname + url.pathname) || isPrivateOrUnauthorizedInviteUrl(contact.url)) return null;
    const sourceById = new Map(sources.map(source => [source.id, source]));
    const cited = contact.sourceIds.map(id => sourceById.get(id));
    if (cited.some(source => !source || (source.evidence !== "official_current" &&
        !(source.evidence === "operator_statement" && node.kind === "provider" && contact.kind === "official_portal")))) return null;
    const sameInstitution = (source: OrganizationSource) => {
      const host = new URL(source.url).hostname.replace(/^www\./, "");
      const contactHost = url.hostname.replace(/^www\./, "");
      return contactHost === host || contactHost.endsWith("." + host);
    };
    if (!cited.some(source => source && (contact.kind === "functional_contact" ? source.url === contact.url : sameInstitution(source)))) return null;
    return { label: contact.label, url: contact.url, kind: contact.kind, sourceIds: [...contact.sourceIds] };
  } catch {
    return null;
  }
}

export function validatePublicCleanlinessOrganization(
  dataset: PublicCleanlinessCityDataset = PARIS_PUBLIC_CLEANLINESS_DATASET,
  annuaireIds: ReadonlySet<string> = new Set(INITIAL_ANNUAIRE_ENTRIES.map((entry) => entry.id)),
): string[] {
  const errors: string[] = [];
  const cityOption = getArrondissementCityOptions().find((option) => option.value === dataset.city);
  const validTerritories = new Set(dataset.territoryIds);
  const sourceIds = new Set<string>();
  const nodesById = new Map<string, PublicCleanlinessOrganizationNode>();
  const ids = new Set<string>();
  const directoryIds = new Set<string>();
  const networkIds = new Set<string>();
  const sourceRefs = new Set<string>();
  const peopleByEvidence = new Set<string>();
  const sourcesById = new Map(dataset.sources.map((item) => [item.id, item]));
  if (!cityOption) errors.push(`unknown-city:${dataset.city}`);
  if (dataset.territoryIds.length === 0) errors.push(`missing-city-territories:${dataset.city}`);
  if (validTerritories.size !== dataset.territoryIds.length) errors.push(`duplicate-city-territory:${dataset.city}`);
  if (dataset.sources.length === 0) errors.push(`missing-city-sources:${dataset.city}`);
  for (const territory of dataset.territoryIds) {
    const match = territory.match(/^([^:]+):(\d+)$/);
    if (!match || match[1] !== dataset.city || !cityOption || Number(match[2]) < 1 || Number(match[2]) > getArrondissementCityCount(dataset.city)) {
      errors.push(`invalid-dataset-territory:${territory}`);
    }
  }
  for (const sourceItem of dataset.sources) {
    if (sourceIds.has(sourceItem.id)) errors.push(`duplicate-source:${sourceItem.id}`);
    sourceIds.add(sourceItem.id);
    try {
      if (new URL(sourceItem.url).protocol !== "https:") errors.push(`invalid-source-url:${sourceItem.id}`);
    } catch {
      errors.push(`invalid-source-url:${sourceItem.id}`);
    }
  }
  for (const node of dataset.nodes) {
    if (ids.has(node.id)) errors.push(`duplicate-node:${node.id}`);
    ids.add(node.id);
    nodesById.set(node.id, node);
    if (!node.sourceIds.length || node.sourceIds.some((id) => !sourceIds.has(id))) errors.push(`invalid-source:${node.id}`);
    for (const territory of node.territoryIds) if (!validTerritories.has(territory)) errors.push(`invalid-territory:${node.id}:${territory}`);
    if (new Set(node.territoryIds).size !== node.territoryIds.length) errors.push(`duplicate-node-territory:${node.id}`);
    if (node.kind === "person") {
      // Identical names alone do not prove identical people.
      const key = JSON.stringify([node.name.normalize("NFKC").toLocaleLowerCase("fr-FR"), [...node.sourceIds].sort(), [...node.territoryIds].sort()]);
      if (peopleByEvidence.has(key)) errors.push(`duplicate-person-evidence:${node.id}`);
      peopleByEvidence.add(key);
    }
    if (node.networkActorId) {
      if (networkIds.has(node.networkActorId)) errors.push(`duplicate-network-actor:${node.networkActorId}`);
      networkIds.add(node.networkActorId);
    }
    if (node.publicContact) {
      const contact = node.publicContact;
      const contactSources = contact.sourceIds.map((id) => sourcesById.get(id));
      if (node.kind === "person" || node.kind === "position" || node.kind === "profession" ||
          !contact.label.trim() || contact.label.includes("@") ||
          !contactSources.length || contactSources.some((item) => !item || (item.evidence !== "official_current" && !(item.evidence === "operator_statement" && node.kind === "provider" && contact.kind === "official_portal")))) {
        errors.push(`invalid-public-contact:${node.id}`);
      }
      try {
        const url = new URL(contact.url);
        if (url.protocol !== "https:" || url.username || url.password || /offres|recrutement/i.test(url.hostname + url.pathname)) errors.push(`invalid-public-contact-url:${node.id}`);
      } catch {
        errors.push(`invalid-public-contact-url:${node.id}`);
      }
      if (contact.kind === "functional_contact" && !contactSources.some((item) => item?.url === contact.url)) errors.push(`unproven-functional-contact:${node.id}`);
      if (!getPublicCleanlinessContact(node, dataset.sources)) errors.push(`unsafe-public-contact:${node.id}`);
      for (const id of contact.sourceIds) sourceRefs.add(id);
    }
    if (node.directoryId) {
      if (!annuaireIds.has(node.directoryId)) errors.push(`unknown-directory-id:${node.id}:${node.directoryId}`);
      if (directoryIds.has(node.directoryId)) errors.push(`duplicate-directory-id:${node.directoryId}`);
      directoryIds.add(node.directoryId);
    }
    for (const sourceId of node.sourceIds) sourceRefs.add(sourceId);
  }
  const edgeIds = new Set<string>();
  const edgeKeys = new Set<string>();
  const hierarchy = new Map<string, string[]>();
  const hierarchyParents = new Map<string, string[]>();
  for (const relation of dataset.relations) {
    if (edgeIds.has(relation.id)) errors.push(`duplicate-relation:${relation.id}`);
    edgeIds.add(relation.id);
    const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if ((relation.validFrom && !isDate(relation.validFrom)) || (relation.validUntil && !isDate(relation.validUntil)) || (relation.validFrom && relation.validUntil && relation.validFrom > relation.validUntil)) errors.push(`invalid-relation-validity:${relation.id}`);
    const edgeKey = JSON.stringify([relation.kind, relation.from, relation.to]);
    if (edgeKeys.has(edgeKey)) errors.push(`duplicate-relation-endpoints:${relation.id}`);
    edgeKeys.add(edgeKey);
    if (relation.kind === "assignment") {
      const person = nodesById.get(relation.from);
      const role = nodesById.get(relation.to);
      if (person?.kind !== "person" || role?.kind !== "position") errors.push(`invalid-assignment:${relation.id}`);
      if (relation.status === "confirmed" && (person?.assignment !== "confirmed" || role?.assignment !== "confirmed")) errors.push(`unproven-current-assignment:${relation.id}`);
      if (person?.territoryIds.length && role?.territoryIds.length && !person.territoryIds.some((id) => role.territoryIds.includes(id))) errors.push(`assignment-territory-mismatch:${relation.id}`);
    }
    if (!ids.has(relation.from) || !ids.has(relation.to)) errors.push(`missing-endpoint:${relation.id}`);
    if (!relation.sourceIds.length || relation.sourceIds.some((id) => !sourceIds.has(id))) errors.push(`invalid-relation-source:${relation.id}`);
    for (const sourceId of relation.sourceIds) sourceRefs.add(sourceId);
    if (relation.kind === "hierarchy") {
      hierarchy.set(relation.from, [...(hierarchy.get(relation.from) ?? []), relation.to]);
      hierarchyParents.set(relation.to, [...(hierarchyParents.get(relation.to) ?? []), relation.from]);
    }
  }
  for (const [nodeId, parents] of hierarchyParents) {
    if (parents.length > 1) errors.push(`multiple-hierarchy-parents:${nodeId}`);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) { errors.push(`hierarchy-cycle:${id}`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const child of hierarchy.get(id) ?? []) visit(child);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of ids) visit(id);
  for (const node of dataset.nodes) {
    if (node.legalEmployerId) {
      const employer = nodesById.get(node.legalEmployerId);
      if (!employer) errors.push(`missing-employer:${node.id}:${node.legalEmployerId}`);
      else if (employer.kind !== "city" && employer.kind !== "provider") errors.push(`invalid-legal-employer:${node.id}:${node.legalEmployerId}`);
    }
    if (node.unitId) {
      if (!nodesById.has(node.unitId)) errors.push(`missing-unit:${node.id}:${node.unitId}`);
      if (!(hierarchyParents.get(node.id) ?? []).includes(node.unitId)) errors.push(`unit-hierarchy-mismatch:${node.id}:${node.unitId}`);
    }
  }
  for (const sourceItem of dataset.sources) if (!sourceRefs.has(sourceItem.id)) errors.push(`unused-source:${sourceItem.id}`);
  const coverageByGroup = new Map<string, Set<string>>();
  for (const node of dataset.nodes.filter((entry) => entry.territoryCoverageGroup)) {
    const covered = coverageByGroup.get(node.territoryCoverageGroup!) ?? new Set<string>();
    for (const territory of node.territoryIds) {
      if (covered.has(territory)) errors.push(`duplicated-division-territory:${node.id}`);
      covered.add(territory);
    }
    coverageByGroup.set(node.territoryCoverageGroup!, covered);
  }
  for (const group of dataset.requiredCoverageGroups ?? []) {
    const coverage = coverageByGroup.get(group);
    for (const territory of dataset.territoryIds) if (!coverage?.has(territory)) errors.push(`missing-coverage-territory:${group}:${territory}`);
  }
  return errors;
}

export function filterPublicCleanlinessNodes(
  filters: PublicCleanlinessFilters,
  datasets: PublicCleanlinessCityDatasets = PUBLIC_CLEANLINESS_CITY_DATASETS,
): PublicCleanlinessOrganizationNode[] {
  const cityOptions = getArrondissementCityOptions();
  if (!cityOptions.some((city) => city.value === filters.city)) return [];
  const dataset = getPublicCleanlinessCityDataset(filters.city, datasets);
  if (!dataset || dataset.city !== filters.city) return [];
  const territoryId = filters.arrondissement === null ? null : `${filters.city}:${filters.arrondissement}`;
  const query = filters.query.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR").trim();
  return dataset.nodes.filter((node) => {
    const territoryMatches = territoryId === null || node.territoryIds.length === 0 || node.territoryIds.includes(territoryId);
    const serviceMatches = filters.service === "all" || node.service === filters.service;
    const searchableText = `${node.name} ${node.description} ${(node.searchTerms ?? []).join(" ")}`.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
    const queryMatches = !query || searchableText.includes(query);
    return territoryMatches && serviceMatches && queryMatches;
  });
}
