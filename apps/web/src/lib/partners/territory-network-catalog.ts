import {
  PARIS_CLEANWALK_ACTORS,
  PARIS_CLEANWALK_RELATIONS,
  type ParisCleanwalkActor,
  type ParisCleanwalkRelation,
} from "./paris-cleanwalk-network";

export type TerritoryCatalogGroup =
  | "metropole"
  | "drom"
  | "outre_mer"
  | "francophonie";

export type TerritoryAdminLevel =
  | "region_cog"
  | "collectivite_outre_mer"
  | "taaf_clipperton"
  | "oif_member"
  | "oif_associate"
  | "oif_observer"
  | "oif_subdivision";

export type OifMembershipStatus = "membre" | "associe" | "observateur";

export interface TerritoryEntry {
  id: string;
  code: string;
  nameFr: string;
  nameEn: string;
  adminLevel: TerritoryAdminLevel;
  countryCode: string;
  countryNameFr: string;
  group: TerritoryCatalogGroup;
  oifStatus?: OifMembershipStatus;
  /** False for uninhabited territories (984 TAAF, 989 Clipperton), excluded from proximity ranking. */
  hasPermanentPopulation: boolean;
  /** Representative [lat, lng] point for geodesic approximation when polygon geometry is unavailable. */
  representativePoint: [number, number] | null;
  sourceUrl: string;
}

export const TERRITORY_GROUP_LABELS_FR: Record<TerritoryCatalogGroup, string> = {
  metropole: "France métropolitaine",
  drom: "DROM",
  outre_mer: "Autres outre-mer",
  francophonie: "Francophonie internationale",
};

export const TERRITORY_GROUP_LABELS_EN: Record<TerritoryCatalogGroup, string> = {
  metropole: "Metropolitan France",
  drom: "Overseas departments (DROM)",
  outre_mer: "Other French overseas territories",
  francophonie: "International Francophonie (OIF)",
};

export interface TerritoryNetworkDataset {
  territoryId: string;
  pilotLabelFr: string;
  pilotLabelEn: string;
  isPilot: boolean;
  actors: readonly ParisCleanwalkActor[];
  relations: readonly ParisCleanwalkRelation[];
}

export const DEFAULT_TERRITORY_ID = "FR:REG:11";

const TERRITORY_NETWORK_REGISTRY: Record<string, TerritoryNetworkDataset> = {
  "FR:REG:11": {
    territoryId: "FR:REG:11",
    pilotLabelFr: "Pilote : Paris intramuros (Île-de-France non exhaustive)",
    pilotLabelEn: "Pilot: Paris intramuros (non-exhaustive Île-de-France)",
    isPilot: true,
    actors: PARIS_CLEANWALK_ACTORS,
    relations: PARIS_CLEANWALK_RELATIONS,
  },
};

export function getTerritoryNetworkDataset(
  territoryId: string,
): TerritoryNetworkDataset | null {
  return TERRITORY_NETWORK_REGISTRY[territoryId] ?? null;
}
