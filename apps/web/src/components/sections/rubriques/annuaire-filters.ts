import type { AnnuaireEntry } from"./annuaire-map-canvas";
import type { ParisArrondissement } from"@/lib/geo/paris-arrondissements";

export type EntityKind = AnnuaireEntry["kind"];
export type ContributionType = AnnuaireEntry["contributionTypes"][number];
export type ZoneFilter ="all" |"nearby" | ParisArrondissement;

export const KIND_FILTERS: Array<{ value: EntityKind |"all"; label: string }> =
 [
 { value:"all", label:"Toutes les structures" },
 { value:"association", label:"Associations" },
 { value:"commerce", label:"Commerçant·e·s" },
 { value:"entreprise", label:"Entreprises" },
 { value:"groupe_parole", label:"Collectifs" },
 { value:"evenement", label:"Collectifs événementiels" },
 ];

export const CONTRIBUTION_FILTERS: Array<{
 value: ContributionType |"all";
 label: string;
}> = [
 { value:"all", label:"Toutes les aides" },
 { value:"materiel", label:"Matériel" },
 { value:"logistique", label:"Logistique" },
 { value:"accueil", label:"Accueil" },
 { value:"financement", label:"Financement" },
 { value:"communication", label:"Communication" },
];

export const ACTOR_CARDS_PAGE_SIZE = 8;
