import type { AnnuaireEntry } from "@/lib/partners/annuaire-types";
import { getNetworkPublicAddress, getNetworkPublicLogo, type NetworkPublicLogo } from "@/lib/partners/public-network-identity-media";
import {
  PARIS_CLEANWALK_ACTORS,
  PARIS_CLEANWALK_RELATIONS,
  type ParisCleanwalkActor,
  type ParisCleanwalkRelation,
} from "@/lib/partners/paris-cleanwalk-network";
import {
  formatAnnuaireCoverage,
  hasPreciseAnnuaireCoordinates,
  type EnrichedAnnuaireEntry,
} from "./annuaire-helpers";

export type MapScope = "paris" | "national";

/** Limites officielles de Paris intramuros pour le cadrage par défaut. */
export const PARIS_INTRAMUROS_BOUNDS: [[number, number], [number, number]] = [
  [48.8155, 2.2241],
  [48.9021, 2.4699],
];

/** Limites de la France métropolitaine (Corse comprise, outre-mer exclu). */
export const FRANCE_METROPOLITAINE_BOUNDS: [[number, number], [number, number]] = [
  [41.33, -5.14],
  [51.09, 9.56],
];

export interface VerifiedPrincipalLocation {
  lat: number;
  lng: number;
  address: string;
  commune: string;
  nature: string;
  sourceUrl: string;
  verifiedAt: string;
}

/**
 * Implantations principales vérifiées et géocodées via BAN (api-adresse.data.gouv.fr).
 * Inclut les structures nationales/hors-Paris dont le site physique est sourcé.
 */
export const VERIFIED_PRINCIPAL_LOCATIONS: Record<string, VerifiedPrincipalLocation> = {
  "asso-3": {
    lat: 48.8959,
    lng: 2.353156,
    address: "132 rue des Poissonniers, 75018 Paris",
    commune: "Paris 18e",
    nature: "Atelier-boutique principal",
    sourceUrl: "https://cartonplein.org/",
    verifiedAt: "2026-11-25",
  },
  "asso-4": {
    lat: 48.856188,
    lng: 2.355693,
    address: "2 place Baudoyer, 75004 Paris",
    commune: "Paris 4e",
    nature: "Lieu d'activité municipal",
    sourceUrl: "https://www.paris.fr/lieux/academie-du-climat-19507",
    verifiedAt: "2026-11-25",
  },
  "asso-shakirail": {
    lat: 48.889965,
    lng: 2.364244,
    address: "72 rue Riquet, 75018 Paris",
    commune: "Paris 18e",
    nature: "Lieu d'activité",
    sourceUrl: "https://www.paris.fr/lieux/le-shakirail-19291",
    verifiedAt: "2026-11-25",
  },
  "com-1": {
    lat: 48.881395,
    lng: 2.362914,
    address: "22 rue du Château Landon, 75010 Paris",
    commune: "Paris 10e",
    nature: "Atelier-boutique",
    sourceUrl: "https://latextilerie.fr/",
    verifiedAt: "2026-11-25",
  },
  "asso-megots-alcome": {
    lat: 48.873504,
    lng: 2.309341,
    address: "164 rue du Faubourg Saint-Honoré, 75008 Paris",
    commune: "Paris 8e",
    nature: "Siège social (éco-organisme)",
    sourceUrl: "https://alcome.eco/mentions-legales/",
    verifiedAt: "2026-11-25",
  },
  "asso-megots-tchaomegot": {
    lat: 49.417315,
    lng: 2.253688,
    address: "12 rue Benjamin Delessert, 60510 Bresles",
    commune: "Bresles (60)",
    nature: "Site professionnel (pas un dépôt libre)",
    sourceUrl: "https://tchaomegot.com/mentions-legales/",
    verifiedAt: "2026-11-25",
  },
  "operator-ckfd": {
    lat: 48.926182,
    lng: 2.316068,
    address: "86-114 Avenue Louis Roche, 92230 Gennevilliers",
    commune: "Gennevilliers (92)",
    nature: "Siège / site de massification",
    sourceUrl: "https://www.ckfd.fr/recyclage-dechets/megot-de-cigarette",
    verifiedAt: "2026-11-25",
  },
  "operator-mego": {
    lat: 48.466755,
    lng: -4.336828,
    address: "11 ZAE Penhoat, 29800 Saint-Divy",
    commune: "Saint-Divy (29 · Bretagne)",
    nature: "Site industriel (aucun dépôt public parisien)",
    sourceUrl: "https://www.me-go.fr/contact/",
    verifiedAt: "2026-11-25",
  },
  "operator-carton-plein-cyclo": {
    lat: 48.852473,
    lng: 2.380427,
    address: "12 Rue Charles Delescluze, 75011 Paris",
    commune: "Paris 11e",
    nature: "Hub de cyclologistique",
    sourceUrl: "https://cartonplein.org/nos-services-cyclologistique/",
    verifiedAt: "2026-11-25",
  },
  "com-2": {
    lat: 48.865024,
    lng: 2.455023,
    address: "18 rue Saint-Antoine, 93100 Montreuil",
    commune: "Montreuil (93)",
    nature: "Atelier",
    sourceUrl: "https://lacollecterie.org/",
    verifiedAt: "2026-11-25",
  },
  "evt-1": {
    lat: 48.897647,
    lng: 2.344183,
    address: "83 boulevard Ornano, 75018 Paris",
    commune: "Paris 18e",
    nature: "Lieu d'activité",
    sourceUrl: "https://www.larecyclerie.com/",
    verifiedAt: "2026-11-25",
  },
  "mairie-paris-5": {
    lat: 48.8462,
    lng: 2.3447,
    address: "21 Place du Panthéon, 75005 Paris",
    commune: "Paris 5e",
    nature: "Mairie d'arrondissement",
    sourceUrl: "https://mairie05.paris.fr/",
    verifiedAt: "2026-11-25",
  },
  "mairie-paris-6": {
    lat: 48.8505,
    lng: 2.3324,
    address: "78 Rue Bonaparte, 75006 Paris",
    commune: "Paris 6e",
    nature: "Mairie d'arrondissement",
    sourceUrl: "https://mairie06.paris.fr/",
    verifiedAt: "2026-11-25",
  },
};

export type GeoLocationGroup = "in_paris" | "outside_paris" | "unknown_location";
export type PublicAddressStatus = "verified" | "contradictory" | "not_applicable" | "unknown";

export interface GeoNetworkFactualIndicators {
  /** Nombre de voisins distincts dans les relations prouvées (hors auto-liens, programmé et similarités). */
  documentedNeighborsCount: number;
  /** Nombre de collaborations programmées (non comptées comme activité actuelle). */
  scheduledLinksCount: number;
  /** Nombre d'opérations communes prouvées (null si non documenté). */
  provenJointOperationsCount: number | null;
  /** Périmètre factuel déclaré ou documenté. */
  activityScopeLabel: string;
}

export interface GeoNetworkEntity {
  id: string;
  annuaireEntryId: string | null;
  networkActorId: string | null;
  name: string;
  shortName: string;
  entry: EnrichedAnnuaireEntry | null;
  networkActor: ParisCleanwalkActor | null;
  coords: { lat: number; lng: number } | null;
  locationGroup: GeoLocationGroup;
  addressStatus: PublicAddressStatus;
  communeLabel: string;
  siteNature: string | null;
  sourceUrl: string | null;
  publicAddressLabel?: string | null;
  publicAddressSource?: string | null;
  logo?: NetworkPublicLogo | null;
  primaryFamily: string;
  indicators: GeoNetworkFactualIndicators;
}

export interface GeoNetworkIncidentRelation {
  relation: ParisCleanwalkRelation;
  fromEntity: GeoNetworkEntity;
  toEntity: GeoNetworkEntity;
  hasPlottableLine: boolean;
  direction: "outgoing" | "incoming";
}

export function isInParisIntramuros(lat: number, lng: number): boolean {
  const [[south, west], [north, east]] = PARIS_INTRAMUROS_BOUNDS;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

export function isInFranceMetropolitaine(lat: number, lng: number): boolean {
  const [[south, west], [north, east]] = FRANCE_METROPOLITAINE_BOUNDS;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

export function formatShortMarkerLabel(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 18) return trimmed;
  const paren = trimmed.match(/\(([A-Z0-9À-ÖØ-Þ][A-Za-z0-9À-ÖØ-öø-ÿ\s-]{1,11})\)/);
  if (paren) return paren[1];
  const words = trimmed.split(/\s+/);
  if (words.length >= 2 && words.slice(0, 2).join(" ").length <= 18) {
    return words.slice(0, 2).join(" ");
  }
  return `${trimmed.slice(0, 16)}…`;
}

function resolveCoordsForEntity(
  id: string,
  entry: AnnuaireEntry | null,
): { coords: { lat: number; lng: number } | null; verified: VerifiedPrincipalLocation | null } {
  const verified = VERIFIED_PRINCIPAL_LOCATIONS[id] ?? null;
  if (verified) {
    return { coords: { lat: verified.lat, lng: verified.lng }, verified };
  }
  if (entry && hasPreciseAnnuaireCoordinates(entry) && entry.lat !== null && entry.lng !== null) {
    return { coords: { lat: entry.lat, lng: entry.lng }, verified: null };
  }
  return { coords: null, verified: null };
}

function resolveAddressStatus(
  entry: AnnuaireEntry | null,
  verified: VerifiedPrincipalLocation | null,
): PublicAddressStatus {
  if (verified || (entry?.provenance === "editorial_seed" && entry.publicAddress)) {
    return "verified";
  }
  if (entry?.provenance === "editorial_seed" && entry.schoolProfile?.addresses?.length) {
    return entry.schoolProfile.addresses.length > 1 ? "contradictory" : "verified";
  }
  if (entry?.kind === "evenement") {
    return "not_applicable";
  }
  return "unknown";
}

function computeFactualIndicators(
  actorId: string | null,
  activityScopeLabel: string,
): GeoNetworkFactualIndicators {
  if (!actorId) {
    return {
      documentedNeighborsCount: 0,
      scheduledLinksCount: 0,
      provenJointOperationsCount: null,
      activityScopeLabel,
    };
  }
  const neighbors = new Set<string>();
  let scheduled = 0;
  const operations = new Set<string>();
  let hasOperations = false;

  for (const rel of PARIS_CLEANWALK_RELATIONS) {
    if (rel.sourceId !== actorId && rel.targetId !== actorId) continue;
    if (rel.sourceId === rel.targetId) continue;
    if (rel.relationType === "collaboration_programmee") {
      scheduled += 1;
      continue;
    }
    const peerId = rel.sourceId === actorId ? rel.targetId : rel.sourceId;
    neighbors.add(peerId);
    if (rel.relationType === "action_commune" && rel.frequencyKnown && rel.source.certainty === "verifie" && rel.operations) {
      hasOperations = true;
      for (const op of rel.operations) operations.add(op.id.trim().toLowerCase() + "::" + op.date);
    }
  }

  return {
    documentedNeighborsCount: neighbors.size,
    scheduledLinksCount: scheduled,
    provenJointOperationsCount: hasOperations ? operations.size : null,
    activityScopeLabel,
  };
}

/**
 * Construit le registre géographique unifié à partir des entrées Annuaire filtrées
 * et des acteurs du réseau Paris, sans déduplication par nom (IDs explicites uniquement).
 */
export function buildGeoNetworkEntities(
  filteredEntries: EnrichedAnnuaireEntry[],
  allEntries: EnrichedAnnuaireEntry[],
  includeNetworkOnlyActors = true,
): GeoNetworkEntity[] {
  const actorByAnnuaireId = new Map<string, ParisCleanwalkActor>();
  for (const actor of PARIS_CLEANWALK_ACTORS) {
    if (actor.annuaireEntryId) {
      actorByAnnuaireId.set(actor.annuaireEntryId, actor);
    }
  }

  const entities: GeoNetworkEntity[] = [];
  const seenActorIds = new Set<string>();

  for (const entry of filteredEntries) {
    const networkActor = actorByAnnuaireId.get(entry.id) ?? null;
    if (networkActor) seenActorIds.add(networkActor.id);
    const { coords, verified } = resolveCoordsForEntity(entry.id, entry);
    const address = getNetworkPublicAddress(networkActor?.id ?? entry.id);
    const editorialAddress = entry.provenance === "editorial_seed" ? entry.publicAddress : undefined;
    const locationGroup: GeoLocationGroup = coords
      ? isInParisIntramuros(coords.lat, coords.lng)
        ? "in_paris"
        : "outside_paris"
      : "unknown_location";

    entities.push({
      id: entry.id,
      annuaireEntryId: entry.id,
      networkActorId: networkActor?.id ?? null,
      name: entry.name,
      shortName: formatShortMarkerLabel(entry.name),
      entry,
      networkActor,
      coords,
      locationGroup,
      addressStatus: address ? "verified" : resolveAddressStatus(entry, verified),
      communeLabel: verified?.commune ?? address?.municipality ?? editorialAddress?.municipality ?? entry.location,
      siteNature: verified?.nature ?? address?.nature ?? editorialAddress?.kind ?? null,
      sourceUrl: verified?.sourceUrl ?? address?.sourceUrl ?? editorialAddress?.sourceUrl ?? entry.websiteUrl ?? null,
      publicAddressLabel: verified?.address ?? address?.label ?? editorialAddress?.label ?? null,
      publicAddressSource: verified?.sourceUrl ?? address?.sourceUrl ?? editorialAddress?.sourceUrl ?? null,
      logo: getNetworkPublicLogo(networkActor?.id ?? entry.id),
      primaryFamily: entry.types?.[0] ?? "environnemental",
      indicators: computeFactualIndicators(
        networkActor?.id ?? null,
        formatAnnuaireCoverage(entry),
      ),
    });
  }

  if (!includeNetworkOnlyActors) return entities;

  const allEntryIds = new Set(allEntries.map((e) => e.id));
  for (const actor of PARIS_CLEANWALK_ACTORS) {
    if (seenActorIds.has(actor.id)) continue;
    if (actor.annuaireEntryId && allEntryIds.has(actor.annuaireEntryId)) continue;

    const { coords, verified } = resolveCoordsForEntity(actor.id, null);
    const address = getNetworkPublicAddress(actor.id);
    const locationGroup: GeoLocationGroup = coords
      ? isInParisIntramuros(coords.lat, coords.lng)
        ? "in_paris"
        : "outside_paris"
      : "unknown_location";

    entities.push({
      id: actor.id,
      annuaireEntryId: actor.annuaireEntryId ?? null,
      networkActorId: actor.id,
      name: actor.name,
      shortName: formatShortMarkerLabel(actor.name),
      entry: null,
      networkActor: actor,
      coords,
      locationGroup,
      addressStatus: verified || address ? "verified" : "unknown",
      communeLabel: verified?.commune ?? address?.municipality ?? actor.parisZone.label,
      siteNature: verified?.nature ?? address?.nature ?? null,
      publicAddressLabel: verified?.address ?? address?.label ?? null,
      publicAddressSource: verified?.sourceUrl ?? address?.sourceUrl ?? null,
      logo: getNetworkPublicLogo(actor.id),
      sourceUrl:
        verified?.sourceUrl ??
        actor.publicChannels?.[0]?.url ??
        actor.provenance?.sourceUrl ??
        null,
      primaryFamily: actor.category,
      indicators: computeFactualIndicators(actor.id, actor.parisZone.label),
    });
  }

  return entities;
}

/**
 * Retourne uniquement les relations documentées incidentes à l'entité sélectionnée.
 * Au repos (aucune sélection), retourne un tableau vide (aucun spaghetti).
 */
export function getIncidentGeoRelations(
  selectedId: string | null,
  entities: GeoNetworkEntity[],
): GeoNetworkIncidentRelation[] {
  if (!selectedId) return [];
  const selected = entities.find((e) => e.id === selectedId || e.networkActorId === selectedId);
  const actorId = selected?.networkActorId;
  if (!selected || !actorId) return [];

  return getAllGeoRelations(entities).filter(item => item.relation.sourceId === actorId || item.relation.targetId === actorId).map((item): GeoNetworkIncidentRelation => ({ ...item, direction: item.relation.sourceId === actorId ? "outgoing" : "incoming" }));
}

/** All documented relationships between entities in the active projection. */
export function getAllGeoRelations(entities: GeoNetworkEntity[]): GeoNetworkIncidentRelation[] {
  const entityByActorId = new Map<string, GeoNetworkEntity>();
  for (const entity of entities) {
    if (entity.networkActorId) entityByActorId.set(entity.networkActorId, entity);
  }

  const incident: GeoNetworkIncidentRelation[] = [];
  for (const relation of PARIS_CLEANWALK_RELATIONS) {
    const fromEntity = entityByActorId.get(relation.sourceId);
    const toEntity = entityByActorId.get(relation.targetId);
    if (!fromEntity || !toEntity) continue;
    incident.push({
      relation,
      fromEntity,
      toEntity,
      hasPlottableLine: Boolean(fromEntity.coords && toEntity.coords),
      direction: "outgoing",
    });
  }
  return incident;
}
