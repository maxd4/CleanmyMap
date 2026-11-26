import type { AnnuaireLogic } from "./use-annuaire-logic";
import type { GeoNetworkEntity } from "./annuaire-geo-network.model";
import { normalizeAnnuaireSearchText, tokenizeAnnuaireSearchQuery } from "./annuaire-helpers";

type Filters = Pick<AnnuaireLogic, "searchTerm" | "filterKind" | "filterContribution" | "engagementDomain" | "zoneFilter" | "targetArrondissement">;

/** Network-only actors have a different schema. Never invent missing
 * legal classifications, domain declarations or proximity. */
export function matchesNetworkOnlyFilters(entity: GeoNetworkEntity, filters: Filters): boolean {
  const actor = entity.networkActor;
  if (!actor || entity.entry) return false;
  const text = normalizeAnnuaireSearchText([actor.name, actor.parisZone.label, ...actor.activities].join(" "));
  if (!tokenizeAnnuaireSearchQuery(filters.searchTerm).every(term => text.includes(term))) return false;
  if (filters.filterKind !== "all") {
    const category = actor.category;
    const matchesKind =
      (category === "association_locale" && (filters.filterKind === "association" || filters.filterKind === "groupe_parole")) ||
      (category === "entreprise_rse" && filters.filterKind === "entreprise") ||
      (category === "reseau_evenement" && filters.filterKind === "evenement") ||
      (category === "etablissement_enseignement" && filters.filterKind === "etablissement_enseignement");
    if (!matchesKind) return false;
  }
  if (filters.engagementDomain !== "all" && filters.engagementDomain !== "unclassified") return false;
  if (filters.filterContribution !== "all") {
    const matchesContribution =
      (filters.filterContribution === "materiel" && actor.equipmentAvailability.status === "fournit_materiel") ||
      (filters.filterContribution === "financement" && actor.roles.includes("financeur")) ||
      (filters.filterContribution === "communication" && actor.roles.includes("relais"));
    if (!matchesContribution) return false;
  }
  if (filters.zoneFilter === "nearby") return false;
  if (typeof filters.zoneFilter === "number" && !actor.parisZone.arrondissements.includes(filters.zoneFilter)) return false;
  return true;
}
