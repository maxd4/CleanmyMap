import type { ParisArrondissement } from"@/lib/geo/paris-arrondissements";
import {
 distanceToParisArrondissementKm,
 getParisArrondissementCenter,
 getParisArrondissementLabel,
} from"@/lib/geo/paris-arrondissements";
import {
 buildPartnerWhyThisStructureMatters,
 getPartnerTrustState,
 hasPublicChannel,
 hasRecentUpdate,
 isCompletePartnerEntry,
 isPlaceholderUrl,
 normalizePublicWebUrl,
 type PartnerTrustState,
} from"@/lib/partners/onboarding-types";
import type {
  AnnuaireEntry,
  EditorialAnnuaireEntry,
  PublishedAnnuaireEntry,
} from "@/lib/partners/annuaire-types";

export {
  formatAssociationImpactDate,
  getAssociationImpactSummary,
  getAssociationProfile,
  getAssociationStructureBadge,
  hasTraceableImpactHistory,
  hasTraceablePastActions,
} from "./annuaire-association-profile";

export type EnrichedAnnuaireEntry = AnnuaireEntry & { distanceKm: number | null };

export const ENTITY_LABELS: Record<AnnuaireEntry["kind"], string> = {
 association:"Association",
 groupe_parole:"Collectif",
 evenement:"Collectif",
 commerce:"Commerçant·e",
 entreprise:"Entreprise",
};

export const CONTRIBUTION_LABELS: Record<
 AnnuaireEntry["contributionTypes"][number],
 string
> = {
 materiel:"Matériel",
 logistique:"Logistique",
 accueil:"Accueil",
 financement:"Financement",
 communication:"Communication",
};

export const VERIFICATION_LABELS: Record<AnnuaireEntry["verificationStatus"], string> =
 {
 verifie:"Vérifiée",
 en_cours:"Vérification en cours",
 a_revalider:"À revalider",
 };

export const TRUST_LABELS: Record<PartnerTrustState, string> = {
  trusted:"Confirmée",
  pending:"Non confirmée",
  incomplete:"À compléter",
  editorial:"Ressource éditoriale",
};

export function isEditorialAnnuaireEntry(
  entry: AnnuaireEntry,
): entry is EditorialAnnuaireEntry {
  return entry.provenance === "editorial_seed";
}

export function isPublishedPartnerAnnuaireEntry(
  entry: AnnuaireEntry,
): entry is PublishedAnnuaireEntry {
  return entry.provenance === "published_partner";
}

/**
 * Merge the two sources only on the stable entry id. Similar names, labels
 * and free-form legal identities are deliberately not identity evidence.
 * When the same stable id exists in both sources, the published projection
 * wins so an editorial seed cannot mask an administrative decision.
 */
export function mergeAnnuaireEntries(
 editorialEntries: EditorialAnnuaireEntry[],
 publishedEntries: PublishedAnnuaireEntry[],
): AnnuaireEntry[] {
 const publishedIds = new Set(publishedEntries.map((entry) => entry.id));
 return [
  ...editorialEntries.filter((entry) => !publishedIds.has(entry.id)),
  ...publishedEntries,
 ];
}

export function formatCoverage(
 coveredArrondissements: number[],
 fallback: string,
): string {
 if (coveredArrondissements.length === 0) {
 return fallback;
 }
 return coveredArrondissements
 .map((value) => getParisArrondissementLabel(value as ParisArrondissement))
 .join(",");
}

export function isNationalAnnuaireEntry(entry: AnnuaireEntry): boolean {
 const normalizedLocation = entry.location.trim().toLowerCase();
 return (
  entry.scope === "national" ||
  entry.scope === "france" ||
  normalizedLocation.startsWith("france") ||
  entry.tags?.some((tag) => /^(france|national)$/i.test(tag.trim())) === true
 );
}

export function formatAnnuaireCoverage(entry: AnnuaireEntry): string {
 if (isNationalAnnuaireEntry(entry)) {
  return `Portée nationale · ${entry.location}`;
 }
 if (entry.coveredArrondissements.length > 0) {
  return `Couverture locale · ${formatCoverage(entry.coveredArrondissements, entry.location)}`;
 }
 return entry.location;
}

function coordinatesEqual(
 left: { lat: number; lng: number },
 right: { lat: number; lng: number },
): boolean {
 return Math.abs(left.lat - right.lat) < 0.000001 && Math.abs(left.lng - right.lng) < 0.000001;
}

function isDerivedParisCoverageCoordinate(entry: AnnuaireEntry): boolean {
 if (entry.lat === null || entry.lng === null || entry.coveredArrondissements.length === 0) {
  return false;
 }
 const centers = entry.coveredArrondissements.map((value) =>
  getParisArrondissementCenter(value as ParisArrondissement),
 );
 const average = {
  lat: centers.reduce((sum, center) => sum + center.lat, 0) / centers.length,
  lng: centers.reduce((sum, center) => sum + center.lng, 0) / centers.length,
 };
 return coordinatesEqual({ lat: entry.lat, lng: entry.lng }, average);
}

export function hasPreciseAnnuaireCoordinates(entry: AnnuaireEntry): boolean {
 if (
  entry.lat === null ||
  entry.lng === null ||
  isNationalAnnuaireEntry(entry) ||
  entry.coordinatesSource === "derived_coverage" ||
  isDerivedParisCoverageCoordinate(entry)
 ) {
  return false;
 }

 // These are known map centroids, not organisation locations.
 return !(
  coordinatesEqual({ lat: entry.lat, lng: entry.lng }, { lat: 46.603354, lng: 1.888334 }) ||
  coordinatesEqual({ lat: entry.lat, lng: entry.lng }, { lat: 48.8566, lng: 2.3522 })
 );
}

export function getAnnuaireDistanceKm(
 entry: AnnuaireEntry,
 arrondissement: ParisArrondissement | null,
): number | null {
 if (!arrondissement || !hasPreciseAnnuaireCoordinates(entry)) {
  return null;
 }
 return distanceToParisArrondissementKm(entry.lat!, entry.lng!, arrondissement);
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
 return"Date invalide";
 }
 if (days <= 30) {
 return `Mise à jour récente (${days}j)`;
 }
 if (days <= 90) {
 return `Mise à jour à surveiller (${days}j)`;
 }
 return `Mise à jour ancienne (${days}j)`;
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
 if (!arrondissement || isNationalAnnuaireEntry(entry)) {
 return false;
 }
 return (
 entry.coveredArrondissements.includes(arrondissement) ||
 (distanceKm !== null && distanceKm <= 4.5)
 );
}

export function sanitizeRole(rawRole: unknown): string {
 if (typeof rawRole !=="string") {
 return"benevole";
 }
 return rawRole.trim().toLowerCase() ||"benevole";
}

export function buildDashboardStats(entries: AnnuaireEntry[], pendingCount: number) {
 const allContributions = entries.flatMap(
 (entry) => entry.contributionTypes,
 );
 const uniqueZones = new Set(entries.flatMap((entry) => entry.coveredArrondissements));
 return {
 actors: entries.length,
 zones: uniqueZones.size,
 contributions: allContributions.length,
 pending: pendingCount,
 };
}

export function hasValidPublicChannel(entry: AnnuaireEntry): boolean {
 return hasPublicChannel(entry);
}

export type AnnuairePublicDestination = {
 url: string;
 label: string;
};

export function getAnnuairePublicDestination(
 entry: Pick<
  AnnuaireEntry,
  "primaryChannel" | "websiteUrl" | "instagramUrl" | "facebookUrl"
 >,
): AnnuairePublicDestination | null {
 const candidates = [
  {
   url: entry.primaryChannel?.url,
   label: entry.primaryChannel?.label || "Canal public",
  },
  { url: entry.websiteUrl, label: "Consulter le site" },
  { url: entry.instagramUrl, label: "Consulter Instagram" },
  { url: entry.facebookUrl, label: "Consulter Facebook" },
 ];

 for (const candidate of candidates) {
  const url = normalizePublicWebUrl(candidate.url);
  if (url) {
   return { url, label: candidate.label };
  }
 }

 return null;
}

export function hasRecentPartnerUpdate(entry: AnnuaireEntry): boolean {
 if (!isPublishedPartnerAnnuaireEntry(entry)) {
 return false;
 }
 return hasRecentUpdate(entry.lastUpdatedAt, 90);
}

export function isCompletePublicPartner(entry: AnnuaireEntry): boolean {
 if (!isPublishedPartnerAnnuaireEntry(entry)) {
 return false;
 }
 return isCompletePartnerEntry(entry);
}

export function getEntryTrustState(entry: AnnuaireEntry): PartnerTrustState {
 if (isEditorialAnnuaireEntry(entry)) {
 return "editorial";
 }
 return getPartnerTrustState(entry);
}

export function isPlaceholderPublicUrl(url: string): boolean {
 return isPlaceholderUrl(url);
}

export function getPartnerWhyThisStructureMatters(entry: AnnuaireEntry): string {
 if (isEditorialAnnuaireEntry(entry)) {
 return `Ressource éditoriale à découvrir : ${entry.name}.`;
 }
  return buildPartnerWhyThisStructureMatters(entry);
}

export function compareAnnuaireEntries(
 left: EnrichedAnnuaireEntry,
 right: EnrichedAnnuaireEntry,
): number {
 if (left.isFeatured && !right.isFeatured) return -1;
 if (!left.isFeatured && right.isFeatured) return 1;

 const leftTrust = getEntryTrustState(left);
 const rightTrust = getEntryTrustState(right);
 if (leftTrust === "trusted" && rightTrust !== "trusted") return -1;
 if (leftTrust !== "trusted" && rightTrust === "trusted") return 1;

 if (left.distanceKm !== null && right.distanceKm !== null) {
  return left.distanceKm - right.distanceKm;
 }
 if (left.distanceKm !== null) return -1;
 if (right.distanceKm !== null) return 1;

 return left.name.localeCompare(right.name);
}
