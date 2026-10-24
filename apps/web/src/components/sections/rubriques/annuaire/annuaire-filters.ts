import type { AnnuaireEntry } from "@/lib/partners/annuaire-types";
import type { ParisArrondissement } from"@/lib/geo/paris-arrondissements";

export type EntityKind = AnnuaireEntry["kind"];
export type ContributionType = AnnuaireEntry["contributionTypes"][number];
type EngagementType = AnnuaireEntry["types"][number];
export type EngagementDomainFilter = "all" | "unclassified" | EngagementType;
export type ZoneFilter ="all" |"nearby" | ParisArrondissement;

export const KIND_FILTERS: Array<{ id: string; value: EntityKind | "all"; label: string }> = [
  { id: "all", value: "all", label: "Toutes les structures" },
  { id: "association", value: "association", label: "Associations" },
  { id: "commerce", value: "commerce", label: "Commerçant·e·s" },
  { id: "entreprise", value: "entreprise", label: "Entreprises" },
  { id: "groupe_parole", value: "groupe_parole", label: "Collectifs" },
  { id: "evenement", value: "evenement", label: "Collectifs événementiels" },
];

export const CONTRIBUTION_FILTERS: Array<{
 value: ContributionType | "all";
 label: string;
}> = [
 { value: "all", label: "Toutes les aides" },
 { value: "materiel", label: "Matériel" },
 { value: "logistique", label: "Logistique" },
 { value: "accueil", label: "Accueil" },
 { value: "financement", label: "Financement" },
 { value: "communication", label: "Communication" },
];

export const ENGAGEMENT_DOMAIN_FILTERS: Array<{
  value: EngagementDomainFilter;
  label: string;
  englishLabel: string;
}> = [
  { value: "all", label: "Tous les domaines", englishLabel: "All domains" },
  { value: "environnemental", label: "Environnement", englishLabel: "Environment" },
  { value: "social", label: "Social", englishLabel: "Social" },
  { value: "humanitaire", label: "Humanitaire", englishLabel: "Humanitarian" },
  { value: "unclassified", label: "Domaine non renseigné", englishLabel: "Domain not provided" },
];

export const ACTOR_CARDS_PAGE_SIZE = 8;
