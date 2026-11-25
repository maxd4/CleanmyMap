import type { AnnuaireEntry } from "@/lib/partners/annuaire-types";
import {
  PARIS_CLEANWALK_ACTORS,
  PARIS_CLEANWALK_RELATIONS,
  type ParisCleanwalkActor,
  type ParisCleanwalkRelation,
} from "@/lib/partners/paris-cleanwalk-network";
import { hasPreciseAnnuaireCoordinates, type EnrichedAnnuaireEntry } from "./annuaire-helpers";

/** Limites officielles de Paris intramuros pour le cadrage initial de la carte. */
export const PARIS_INTRAMUROS_BOUNDS: [[number, number], [number, number]] = [
  [48.8155, 2.2241],
  [48.9021, 2.4699],
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
 * Implantations principales vérifiées pour des acteurs du réseau (y compris hors
 * Paris ou nationaux dont l'adresse physique est publiquement sourcée).
 */
export const VERIFIED_PRINCIPAL_LOCATIONS: Record<string, VerifiedPrincipalLocation> = {
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
  communeLabel: string;
  siteNature: string | null;
  sourceUrl: string | null;
  primaryFamily: string;
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
      communeLabel: verified?.commune ?? entry.location,
      siteNature: verified?.nature ?? null,
      sourceUrl: verified?.sourceUrl ?? entry.websiteUrl ?? null,
      primaryFamily: entry.types?.[0] ?? "environnemental",
    });
  }

  if (!includeNetworkOnlyActors) return entities;

  const allEntryIds = new Set(allEntries.map((e) => e.id));
  for (const actor of PARIS_CLEANWALK_ACTORS) {
    if (seenActorIds.has(actor.id)) continue;
    // Skip actors whose linked Annuaire entry exists in the catalog but was filtered out
    if (actor.annuaireEntryId && allEntryIds.has(actor.annuaireEntryId)) continue;

    const { coords, verified } = resolveCoordsForEntity(actor.id, null);
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
      communeLabel: verified?.commune ?? actor.parisZone.label,
      siteNature: verified?.nature ?? null,
      sourceUrl: verified?.sourceUrl ?? actor.publicChannels?.[0]?.url ?? actor.provenance?.sourceUrl ?? null,
      primaryFamily: actor.category,
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

  const entityByActorId = new Map<string, GeoNetworkEntity>();
  for (const entity of entities) {
    if (entity.networkActorId) entityByActorId.set(entity.networkActorId, entity);
  }

  const incident: GeoNetworkIncidentRelation[] = [];
  for (const relation of PARIS_CLEANWALK_RELATIONS) {
    if (relation.sourceId !== actorId && relation.targetId !== actorId) continue;
    const fromEntity = entityByActorId.get(relation.sourceId);
    const toEntity = entityByActorId.get(relation.targetId);
    if (!fromEntity || !toEntity) continue;
    incident.push({
      relation,
      fromEntity,
      toEntity,
      hasPlottableLine: Boolean(fromEntity.coords && toEntity.coords),
      direction: relation.sourceId === actorId ? "outgoing" : "incoming",
    });
  }
  return incident;
}
