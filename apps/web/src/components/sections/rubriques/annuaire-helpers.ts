import type { ParisArrondissement } from "@/lib/geo/paris-arrondissements";
import { getParisArrondissementLabel } from "@/lib/geo/paris-arrondissements";
import type { AnnuaireEntry } from "./annuaire-map-canvas";

export type EnrichedAnnuaireEntry = AnnuaireEntry & { distanceKm: number | null };

export const ENTITY_LABELS: Record<AnnuaireEntry["kind"], string> = {
  association: "Association",
  groupe_parole: "Collectif",
  evenement: "Collectif",
  commerce: "Commercant",
  entreprise: "Entreprise",
};

export const CONTRIBUTION_LABELS: Record<
  AnnuaireEntry["contributionTypes"][number],
  string
> = {
  materiel: "Materiel",
  logistique: "Logistique",
  accueil: "Accueil",
  financement: "Financement",
  communication: "Communication",
};

export const VERIFICATION_LABELS: Record<AnnuaireEntry["verificationStatus"], string> =
  {
    verifie: "Verifiee",
    en_cours: "Verification en cours",
    a_revalider: "A revalider",
  };

export function formatCoverage(
  coveredArrondissements: number[],
  fallback: string,
): string {
  if (coveredArrondissements.length === 0) {
    return fallback;
  }
  return coveredArrondissements
    .map((value) => getParisArrondissementLabel(value as ParisArrondissement))
    .join(", ");
}

export function diffInDays(dateValue: string): number | null {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const diffMs = Date.now() - parsed.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function formatFreshness(lastUpdatedAt: string): string {
  const days = diffInDays(lastUpdatedAt);
  if (days === null) {
    return "Date invalide";
  }
  if (days <= 30) {
    return `Mise a jour recente (${days}j)`;
  }
  if (days <= 90) {
    return `Mise a jour a surveiller (${days}j)`;
  }
  return `Mise a jour ancienne (${days}j)`;
}

export function hasRecentActivity(activityDate: string): boolean {
  const days = diffInDays(activityDate);
  return days !== null && days <= 120;
}

export function isNearbyEntry(
  entry: AnnuaireEntry,
  arrondissement: ParisArrondissement | null,
  distanceKm: number | null,
): boolean {
  if (!arrondissement) {
    return false;
  }
  return (
    entry.coveredArrondissements.includes(arrondissement) ||
    (distanceKm !== null && distanceKm <= 4.5)
  );
}

type Recommendation = {
  entry: EnrichedAnnuaireEntry;
  reason: string;
  score: number;
};

type RecommendationParams = {
  entries: EnrichedAnnuaireEntry[];
  profile: string;
  arrondissement: ParisArrondissement | null;
};

export function sanitizeRole(rawRole: unknown): string {
  if (typeof rawRole !== "string") {
    return "benevole";
  }
  return rawRole.trim().toLowerCase() || "benevole";
}

export function buildDashboardStats(
  activeQualifiedEntries: AnnuaireEntry[],
  pendingCount: number,
) {
  const allContributions = activeQualifiedEntries.flatMap(
    (entry) => entry.contributionTypes,
  );
  const uniqueZones = new Set(
    activeQualifiedEntries.flatMap((entry) => entry.coveredArrondissements),
  );
  return {
    actors: activeQualifiedEntries.length,
    zones: uniqueZones.size,
    contributions: allContributions.length,
    pending: pendingCount,
  };
}

function profileBonus(entry: EnrichedAnnuaireEntry, profile: string): number {
  if (profile === "benevole") {
    return entry.contributionTypes.some((value) =>
      ["accueil", "materiel", "logistique"].includes(value),
    )
      ? 18
      : 0;
  }
  if (profile === "coordinateur") {
    return entry.contributionTypes.some((value) =>
      ["logistique", "communication"].includes(value),
    )
      ? 16
      : 0;
  }
  if (profile === "elu" || profile === "admin") {
    return entry.kind === "commerce" || entry.kind === "entreprise" ? 14 : 8;
  }
  if (profile === "scientifique") {
    return entry.contributionTypes.includes("materiel") ? 12 : 6;
  }
  return 6;
}

function locationBonus(
  entry: EnrichedAnnuaireEntry,
  arrondissement: ParisArrondissement | null,
): number {
  if (!arrondissement) {
    return 0;
  }
  if (entry.coveredArrondissements.includes(arrondissement)) {
    return 18;
  }
  if (entry.distanceKm !== null && entry.distanceKm <= 3) {
    return 12;
  }
  if (entry.distanceKm !== null && entry.distanceKm <= 6) {
    return 6;
  }
  return 0;
}

function recommendationReason(
  entry: EnrichedAnnuaireEntry,
  profile: string,
  arrondissement: ParisArrondissement | null,
): string {
  if (arrondissement && entry.coveredArrondissements.includes(arrondissement)) {
    return `Couvre ${getParisArrondissementLabel(arrondissement)} et adapte au profil ${profile}.`;
  }
  if (entry.distanceKm !== null) {
    return `Proche (${entry.distanceKm.toFixed(1)} km) avec contribution ${entry.contributionTypes[0]}.`;
  }
  return `Compatible avec le profil ${profile} et les contributions proposees.`;
}

export function buildAutomaticRecommendations(
  params: RecommendationParams,
): Recommendation[] {
  const scored = params.entries.map((entry) => {
    const score =
      profileBonus(entry, params.profile) +
      locationBonus(entry, params.arrondissement);
    return {
      entry,
      score,
      reason: recommendationReason(entry, params.profile, params.arrondissement),
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 3);
}
