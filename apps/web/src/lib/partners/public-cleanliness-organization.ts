import { getArrondissementCityOptions, type ArrondissementCity } from "@/lib/geo/paris-arrondissements";

export type OrganizationNodeKind = "city" | "direction" | "service" | "unit" | "team" | "position" | "profession" | "person" | "provider";
export type OrganizationRelationKind = "hierarchy" | "coordination" | "programme" | "service";
export type OrganizationAssignmentStatus = "confirmed" | "historical" | "unknown";

export type OrganizationSource = {
  id: string;
  label: string;
  url: string;
  sourceContentDate?: string;
  verifiedAt: string;
  evidence: "official_current" | "official_historical" | "official_job_profile";
};

export type PublicCleanlinessOrganizationNode = {
  id: string;
  name: string;
  kind: OrganizationNodeKind;
  searchTerms?: readonly string[];
  /** Existing directory identifier where this organization already has one. */
  directoryId?: string;
  employerId?: string;
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
  sourceIds: readonly string[];
};

export const PUBLIC_CLEANLINESS_SOURCES: readonly OrganizationSource[] = [
  { id: "paris-org-chart", label: "Organigramme de la Ville de Paris", url: "https://www.paris.fr/pages/organigramme-de-la-ville-de-paris-2380", sourceContentDate: "2026-09-09", verifiedAt: "2026-11-24", evidence: "official_current" },
  { id: "paris-cleanliness", label: "Propreté : comment la Ville de Paris entretient l'espace public", url: "https://www.paris.fr/pages/la-proprete-239/", sourceContentDate: "2026-09-16", verifiedAt: "2026-11-24", evidence: "official_current" },
  { id: "paris-collection", label: "La collecte des déchets ménagers", url: "https://www.paris.fr/pages/la-collecte-44", sourceContentDate: "2026-09-22", verifiedAt: "2026-11-24", evidence: "official_current" },
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

export const PARIS_PUBLIC_CLEANLINESS_NODES: readonly PublicCleanlinessOrganizationNode[] = [
  { id: "city-paris", name: "Ville de Paris", kind: "city", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "governance", assignment: "confirmed", description: "Collectivité territoriale ; périmètre général du référentiel parisien.", sourceIds: source("paris-org-chart", "paris-directories") },
  { id: "dpe", name: "Direction de la Propreté et de l'Eau (DPE)", kind: "direction", directoryId: "evt-paris-nettoyages", employerId: "city-paris", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "cleaning", assignment: "confirmed", description: "Direction responsable du nettoiement et de la collecte municipale selon les secteurs.", sourceIds: source("paris-cleanliness", "paris-collection") },
  { id: "stpp", name: "Service technique de la propreté de Paris (STPP)", kind: "service", employerId: "dpe", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "cleaning", assignment: "confirmed", description: "Service de la DPE chargé du nettoiement de la voie publique et de la collecte des déchets.", sourceIds: source("paris-cleanliness") },
  ...parisDivisions.map((division) => ({ id: division.id, name: division.label, kind: "unit" as const, employerId: "dpe", territoryIds: division.districts.map((district) => `Paris:${district}`), service: "cleaning" as const, assignment: "confirmed" as const, description: "Division de propreté desservant plusieurs arrondissements ou un arrondissement. Les rattachements locaux détaillés restent inconnus sauf preuve citée.", sourceIds: source("paris-cleanliness") })),
  { id: "brigade-urgence-proprete", name: "Brigades Urgence Propreté", kind: "team", employerId: "dpe", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "emergency", assignment: "confirmed", description: "Équipes mobiles déployées pour traiter des besoins ciblés signalés par les mairies et les habitants.", sourceIds: source("paris-cleanliness") },
  { id: "dpe-field-agents", name: "Agents de terrain — nettoiement et collecte", kind: "profession", employerId: "dpe", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "cleaning", assignment: "confirmed", description: "Représentation collective des agents ; aucun effectif ni identité individuelle n'est affiché dans ce référentiel.", sourceIds: source("paris-cleanliness") },
  { id: "tson-position", name: "Technicien·ne des services opérationnels de nettoiement (TSON)", kind: "position", searchTerms: ["TSON"], employerId: "dpe", territoryIds: ["Paris:17"], service: "cleaning", assignment: "historical", description: "Fiche de poste rattachée à la Division 17 ; elle décrit un poste et un encadrement d'équipe, pas un titulaire actuellement en poste.", sourceIds: source("tson-17-recruitment") },
  { id: "division-17-sectors", name: "Secteurs territoriaux et ateliers (structure décrite pour la Division 17)", kind: "unit", employerId: "division-17", territoryIds: ["Paris:17"], service: "cleaning", assignment: "historical", description: "La fiche de poste de 2025 décrit 3 secteurs territoriaux et 8 ateliers, plus un secteur fonctionnel avec 2 ateliers. Les titulaires ne sont pas renseignés.", sourceIds: source("tson-17-recruitment") },
  { id: "division-17-supervisors", name: "Responsables de division et de secteur (fonctions)", kind: "position", employerId: "dpe", territoryIds: ["Paris:17"], service: "cleaning", assignment: "historical", description: "La fiche de poste décrit une cheffe de division, deux adjoints et un chef de secteur ; ce sont des fonctions organisationnelles, sans identité ni affectation actuelle inférée.", sourceIds: source("tson-17-recruitment") },
  { id: "specialized-cleaning-services", name: "Services spécialisés de propreté", kind: "service", employerId: "dpe", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "cleaning", assignment: "confirmed", description: "La Ville documente des interventions particulières, dont voies souterraines et berges. Les unités et chaînes de rattachement détaillées ne sont pas toutes publiées ici.", sourceIds: source("paris-cleanliness") },
  { id: "eboueurs", name: "Éboueurs et éboueuses", kind: "profession", employerId: "dpe", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "cleaning", assignment: "confirmed", description: "Métier représenté collectivement, sans personnes ni effectifs inventés.", sourceIds: source("paris-cleanliness", "tson-17-recruitment") },
  { id: "collection-drivers", name: "Conducteurs et conductrices d'engins de collecte et nettoiement", kind: "profession", employerId: "dpe", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "collection", assignment: "confirmed", description: "Métier représenté collectivement ; affectations locales inconnues.", sourceIds: source("paris-cleanliness", "tson-17-recruitment") },
  { id: "ddct", name: "Direction de la Démocratie, des Citoyens et des Territoires (DDCT)", kind: "direction", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "coordination", assignment: "confirmed", description: "La DDCT a lancé le déploiement des REQ ; cela ne décrit pas à lui seul une ligne hiérarchique opérationnelle.", sourceIds: source("paris-org-chart", "req-20-recruitment") },
  { id: "borough-mayors", name: "Mairies d'arrondissement", kind: "unit", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "governance", assignment: "confirmed", description: "Échelon municipal local ; aucune affectation individuelle n'est inférée.", sourceIds: source("paris-org-chart", "req-20-recruitment") },
  { id: "dgaep", name: "Directions générales adjointes « Espace public » (DGAEP)", kind: "position", searchTerms: ["DGAEP"], employerId: "city-paris", territoryIds: ["Paris:20"], service: "coordination", assignment: "confirmed", description: "La fiche REQ du 20e indique un rattachement au DGAEP de la mairie d'arrondissement ; le titulaire n'est pas identifié ici.", sourceIds: source("req-20-recruitment") },
  { id: "dgs-19", name: "Direction générale des services (DGS) — mairie du 19e", kind: "service", employerId: "city-paris", territoryIds: ["Paris:19"], service: "governance", assignment: "confirmed", description: "La fiche de poste DGAEP décrit le DGS au sein de la direction générale des services de la mairie du 19e. Aucun nom de titulaire n'est repris.", sourceIds: source("dgaep-19-recruitment") },
  { id: "dgaep-19", name: "DGAEP — mairie du 19e", kind: "position", employerId: "city-paris", territoryIds: ["Paris:19"], service: "coordination", assignment: "historical", description: "Poste décrit dans une offre datée de septembre 2026. L'offre ne prouve pas l'identité d'un titulaire en fonction.", sourceIds: source("dgaep-19-recruitment") },
  { id: "req", name: "Référents et référentes de l'entretien du quartier (REQ)", kind: "position", searchTerms: ["REQ"], employerId: "city-paris", territoryIds: ["Paris:20"], service: "coordination", assignment: "unknown", description: "Offre de poste localisée au 20e et dispositif en déploiement par la DDCT. Les affectations actuelles, quartiers desservis et titulaires ne sont pas établis par cette offre.", sourceIds: source("req-20-recruitment") },
  { id: "municipal-police", name: "Police municipale et prévention (DPMP)", kind: "direction", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "police", assignment: "confirmed", description: "Direction citée parmi les services que les REQ peuvent solliciter ; aucune chaîne de commandement partagée n'est représentée.", sourceIds: source("req-20-recruitment", "paris-org-chart") },
  { id: "prevention-sorting", name: "Prévention, sensibilisation et tri", kind: "service", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "prevention", assignment: "unknown", description: "Fonction publique documentée dans l'écosystème ; rattachement administratif des unités non établi dans les sources utilisées ici.", sourceIds: source("paris-org-chart") },
  { id: "syctom", name: "Syctom", kind: "provider", directoryId: "collectivite-syctom", territoryIds: ALL_PARIS_ARRONDISSEMENTS, service: "provider", assignment: "confirmed", description: "Syndicat de traitement des déchets ; relation de traitement, pas une ligne hiérarchique municipale.", sourceIds: source("paris-collection") },
  { id: "private-collectors", name: "Prestataires privés de collecte", kind: "provider", territoryIds: [], service: "provider", assignment: "confirmed", description: "La collecte municipale de certains arrondissements est réalisée par des entreprises privées. Les titulaires de marché et périmètres précis ne sont pas copiés ici.", sourceIds: source("paris-collection") },
];

export const PARIS_PUBLIC_CLEANLINESS_RELATIONS: readonly PublicCleanlinessOrganizationRelation[] = [
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
  { id: "city-ddct", from: "city-paris", to: "ddct", kind: "hierarchy", status: "confirmed", sourceIds: source("paris-org-chart") },
  { id: "city-mayors", from: "city-paris", to: "borough-mayors", kind: "hierarchy", status: "confirmed", sourceIds: source("paris-org-chart") },
  { id: "mayors-dgaep", from: "borough-mayors", to: "dgaep", kind: "hierarchy", status: "confirmed", sourceIds: source("req-20-recruitment") },
  { id: "dgaep-req", from: "dgaep", to: "req", kind: "hierarchy", status: "confirmed", sourceIds: source("req-20-recruitment") },
  { id: "mayors-dgs19", from: "borough-mayors", to: "dgs-19", kind: "hierarchy", status: "confirmed", sourceIds: source("dgaep-19-recruitment") },
  { id: "dgs19-dgaep19", from: "dgs-19", to: "dgaep-19", kind: "hierarchy", status: "historical", sourceIds: source("dgaep-19-recruitment") },
  { id: "ddct-req-programme", from: "ddct", to: "req", kind: "programme", status: "confirmed", sourceIds: source("req-20-recruitment") },
  { id: "req-dpe-coordination", from: "req", to: "dpe", kind: "coordination", status: "confirmed", sourceIds: source("req-20-recruitment") },
  { id: "req-police-coordination", from: "req", to: "municipal-police", kind: "coordination", status: "confirmed", sourceIds: source("req-20-recruitment") },
  { id: "city-prevention", from: "city-paris", to: "prevention-sorting", kind: "hierarchy", status: "unknown", sourceIds: source("paris-org-chart") },
  { id: "city-syctom", from: "city-paris", to: "syctom", kind: "service", status: "confirmed", sourceIds: source("paris-collection") },
  { id: "city-private-collectors", from: "city-paris", to: "private-collectors", kind: "service", status: "confirmed", sourceIds: source("paris-collection") },
];

export type PublicCleanlinessCityDataset = {
  nodes: readonly PublicCleanlinessOrganizationNode[];
  relations: readonly PublicCleanlinessOrganizationRelation[];
  sources: readonly OrganizationSource[];
};

/** Add a city's documented registry entry here; filters and rendering are city-agnostic. */
export const PUBLIC_CLEANLINESS_CITY_DATASETS: Partial<Record<ArrondissementCity, PublicCleanlinessCityDataset>> = {
  Paris: { nodes: PARIS_PUBLIC_CLEANLINESS_NODES, relations: PARIS_PUBLIC_CLEANLINESS_RELATIONS, sources: PUBLIC_CLEANLINESS_SOURCES },
};

export function getPublicCleanlinessCityDataset(city: string): PublicCleanlinessCityDataset | null {
  return Object.prototype.hasOwnProperty.call(PUBLIC_CLEANLINESS_CITY_DATASETS, city)
    ? PUBLIC_CLEANLINESS_CITY_DATASETS[city as ArrondissementCity] ?? null
    : null;
}

export type PublicCleanlinessFilters = { city: string; arrondissement: number | null; service: PublicCleanlinessOrganizationNode["service"] | "all"; query: string };

export function validatePublicCleanlinessOrganization(nodes = PARIS_PUBLIC_CLEANLINESS_NODES, relations = PARIS_PUBLIC_CLEANLINESS_RELATIONS): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const node of nodes) {
    if (ids.has(node.id)) errors.push(`duplicate-node:${node.id}`);
    ids.add(node.id);
    if (!node.sourceIds.length || node.sourceIds.some((id) => !PUBLIC_CLEANLINESS_SOURCES.some((sourceItem) => sourceItem.id === id))) errors.push(`invalid-source:${node.id}`);
    for (const territory of node.territoryIds) if (!/^Paris:(?:[1-9]|1\d|20)$/.test(territory)) errors.push(`invalid-territory:${node.id}:${territory}`);
  }
  const edgeIds = new Set<string>();
  const hierarchy = new Map<string, string[]>();
  for (const relation of relations) {
    if (edgeIds.has(relation.id)) errors.push(`duplicate-relation:${relation.id}`);
    edgeIds.add(relation.id);
    if (!ids.has(relation.from) || !ids.has(relation.to)) errors.push(`missing-endpoint:${relation.id}`);
    if (!relation.sourceIds.length || relation.sourceIds.some((id) => !PUBLIC_CLEANLINESS_SOURCES.some((sourceItem) => sourceItem.id === id))) errors.push(`invalid-relation-source:${relation.id}`);
    if (relation.kind === "hierarchy") hierarchy.set(relation.from, [...(hierarchy.get(relation.from) ?? []), relation.to]);
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
  for (const division of nodes.filter((node) => /^division-\d{2}(?:-\d{2})?$/.test(node.id))) {
    const repeatedTerritories = division.territoryIds.filter((territory) => nodes.some((other) => other.id !== division.id && /^division-\d{2}(?:-\d{2})?$/.test(other.id) && other.territoryIds.includes(territory)));
    if (repeatedTerritories.length) errors.push(`duplicated-division-territory:${division.id}`);
  }
  return errors;
}

export function filterPublicCleanlinessNodes(filters: PublicCleanlinessFilters, nodes?: readonly PublicCleanlinessOrganizationNode[]): PublicCleanlinessOrganizationNode[] {
  const cityOptions = getArrondissementCityOptions();
  if (!cityOptions.some((city) => city.value === filters.city)) return [];
  const cityNodes = nodes ?? getPublicCleanlinessCityDataset(filters.city)?.nodes;
  if (!cityNodes) return [];
  const territoryId = filters.arrondissement === null ? null : `${filters.city}:${filters.arrondissement}`;
  const query = filters.query.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR").trim();
  return cityNodes.filter((node) => {
    const territoryMatches = territoryId === null || node.territoryIds.length === 0 || node.territoryIds.includes(territoryId);
    const serviceMatches = filters.service === "all" || node.service === filters.service;
    const searchableText = `${node.name} ${node.description} ${(node.searchTerms ?? []).join(" ")}`.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
    const queryMatches = !query || searchableText.includes(query);
    return territoryMatches && serviceMatches && queryMatches;
  });
}
