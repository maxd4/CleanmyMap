import type { ImpactTerrain2026PublicResults } from "@/lib/impact/impact-terrain-2026-results";
import type { ImpactTerrain2026StreetCleaningSavings } from "@/lib/impact/impact-terrain-2026";
import type { ActionDistributionEntry } from "./action-participant-aggregation";

/**
 * Configuration et helpers pour la page d'accueil
 */

/**
 * Résultats déjà calculés dans le snapshot public de la homepage.
 * Les composants de présentation ne doivent pas reconstruire ces valeurs.
 */
export type HomeImpactSnapshot = Readonly<{
  participantsTotal: number;
  actionDistribution: readonly ActionDistributionEntry[];
  impactTerrain: ImpactTerrain2026PublicResults;
  streetCleaningSavings: ImpactTerrain2026StreetCleaningSavings;
}>;
