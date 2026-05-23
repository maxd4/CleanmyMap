import type { ParisArrondissement } from"@/lib/geo/paris-arrondissements";
import { getParisArrondissementLabel } from"@/lib/geo/paris-arrondissements";
import {
 buildPartnerWhyThisStructureMatters,
 getPartnerTrustState,
 hasPublicChannel,
 hasRecentUpdate,
 isCompletePartnerEntry,
 isPlaceholderUrl,
 type PartnerTrustState,
} from"@/lib/partners/onboarding-types";
import type {
 AnnuaireEntry,
 AssociationImpactHistory,
 AssociationProfile,
 AssociationPublicCall,
 AssociationResource,
} from"./annuaire-map-canvas";

export type { AnnuaireEntry };

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
 .join(",");
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

export function hasRecentPartnerUpdate(entry: AnnuaireEntry): boolean {
 return hasRecentUpdate(entry.lastUpdatedAt, 90);
}

export function isCompletePublicPartner(entry: AnnuaireEntry): boolean {
 return isCompletePartnerEntry(entry);
}

export function getEntryTrustState(entry: AnnuaireEntry): PartnerTrustState {
 return getPartnerTrustState(entry);
}

export function isPlaceholderPublicUrl(url: string): boolean {
 return isPlaceholderUrl(url);
}

export function getPartnerWhyThisStructureMatters(entry: AnnuaireEntry): string {
 return buildPartnerWhyThisStructureMatters(entry);
}

function cleanText(value: string | undefined): string {
 return value?.trim().replace(/\s+/g, " ") ?? "";
}

function uniqueLabels(values: string[]): string[] {
 return [...new Set(values.map((value) => cleanText(value)).filter(Boolean))];
}

function formatNumberLabel(value: number): string {
 return `${value}`;
}

function buildAssociationMission(entry: AnnuaireEntry): string {
 if (entry.associationProfile?.mission) {
 return cleanText(entry.associationProfile.mission);
 }
 if (entry.featuredReason) {
 return cleanText(entry.featuredReason);
 }
 const source = cleanText(entry.description);
 if (source) {
 return source;
 }
 return `Structure associative ancrée à ${entry.location}.`;
}

function buildAssociationPastActions(entry: AnnuaireEntry): string[] {
 if (entry.associationProfile?.pastActions?.length) {
 return uniqueLabels(entry.associationProfile.pastActions);
 }

 const source = `${entry.description} ${entry.featuredReason ?? ""}`.toLowerCase();
 const highlights: string[] = [];

 if (/atelier|formation|sensibil/i.test(source)) {
 highlights.push("Ateliers, sensibilisation ou formations");
 }
 if (/collecte|ramassage|nettoyage|déchet|recycl/i.test(source)) {
 highlights.push("Opérations terrain de collecte et de réemploi");
 }
 if (/distribution|aide|accueil|accompagnement/i.test(source)) {
 highlights.push("Accueil, accompagnement ou aide directe");
 }
 if (/plaidoyer|réseau|relais|diffusion|communication/i.test(source)) {
 highlights.push("Relais de mobilisation et diffusion locale");
 }

 return highlights.length > 0 ? uniqueLabels(highlights) : ["Historique d'impact à compléter"];
}

function buildAssociationPublicCalls(entry: AnnuaireEntry): AssociationPublicCall[] {
 if (entry.associationProfile?.publicCalls?.length) {
 return entry.associationProfile.publicCalls;
 }

 const calls: AssociationPublicCall[] = entry.contributionTypes.map((type) => {
 switch (type) {
 case "materiel":
 return {
 type,
 label: "Appel à matériel",
 detail: "Prêt, don ou mise à disposition d'équipements utiles au terrain.",
 };
 case "logistique":
 return {
 type: "benevoles",
 label: "Appel à bénévoles logistiques",
 detail: "Renfort pour l'organisation, la préparation et la coordination.",
 };
 case "accueil":
 return {
 type: "benevoles",
 label: "Appel à bénévoles d'accueil",
 detail: "Renfort pour accueillir, orienter et accompagner les publics.",
 };
 case "financement":
 return {
 type: "dons",
 label: "Appel aux dons",
 detail: "Soutien financier pour pérenniser les actions locales.",
 };
 case "communication":
 return {
 type: "communication",
 label: "Relais de communication",
 detail: "Diffusion des appels, événements et besoins de terrain.",
 };
 default:
 return {
 type: "communication",
 label: "Relais de communication",
 detail: "Diffusion des appels et des besoins de terrain.",
 };
 }
 });

 return calls;
}

function buildAssociationResources(entry: AnnuaireEntry): AssociationResource[] {
 if (entry.associationProfile?.usefulResources?.length) {
 return entry.associationProfile.usefulResources;
 }

 const resources: AssociationResource[] = [];

 if (entry.websiteUrl) {
 resources.push({
 label: "Site officiel",
 description: "Informations publiques, agenda et ressources pratiques.",
 url: entry.websiteUrl,
 });
 }
 if (entry.primaryChannel?.url && entry.primaryChannel.url !== entry.websiteUrl) {
 resources.push({
 label: entry.primaryChannel.label || "Canal de contact",
 description: `Contact via ${entry.primaryChannel.platform}.`,
 url: entry.primaryChannel.url,
 });
 }
 if (entry.instagramUrl) {
 resources.push({
 label: "Instagram",
 description: "Relais visuel et actualités de terrain.",
 url: entry.instagramUrl,
 });
 }
 if (entry.facebookUrl) {
 resources.push({
 label: "Facebook",
 description: "Annonces, événements et relais locaux.",
 url: entry.facebookUrl,
 });
 }

 return resources;
}

function buildAssociationImpactHistory(entry: AnnuaireEntry): AssociationImpactHistory {
 if (entry.associationProfile?.impactHistory) {
 return entry.associationProfile.impactHistory;
 }

 const zonesCovered = entry.coveredArrondissements.length;
 const recurrence =
 entry.availability.toLowerCase().includes("hebdo") ||
 entry.availability.toLowerCase().includes("réguli")
 ? "Actions récurrentes"
 : entry.availability.toLowerCase().includes("ponct")
 ? "Actions ponctuelles"
 : "Cadence à confirmer";

 return {
 zonesCovered,
 recurrence,
 lastActionAt: entry.recentActivityAt,
 note: "Historique local à enrichir avec les actions déclarées.",
 };
}

export function getAssociationProfile(
 entry: AnnuaireEntry,
): AssociationProfile | null {
 if (entry.kind !== "association") {
 return null;
 }

 return {
 mission: buildAssociationMission(entry),
 recurringNeeds: uniqueLabels(
 entry.associationProfile?.recurringNeeds?.length
 ? entry.associationProfile.recurringNeeds
 : entry.contributionTypes.map((type) => {
 switch (type) {
 case "materiel":
 return "Matériel";
 case "logistique":
 return "Bénévoles logistiques";
 case "accueil":
 return "Bénévoles d'accueil";
 case "financement":
 return "Dons";
 case "communication":
 return "Relais de communication";
 default:
 return "Soutien terrain";
 }
 }),
 ),
 pastActions: buildAssociationPastActions(entry),
 usefulResources: buildAssociationResources(entry),
 publicCalls: buildAssociationPublicCalls(entry),
 impactHistory: buildAssociationImpactHistory(entry),
 structureStatus:
 entry.associationProfile?.structureStatus ??
 (entry.verificationStatus === "verifie" && hasRecentPartnerUpdate(entry)
 ? "active_validated"
 : entry.verificationStatus === "verifie"
 ? "validated"
 : hasRecentPartnerUpdate(entry)
 ? "active"
 : "pending"),
 };
}

export function getAssociationStructureBadge(entry: AnnuaireEntry): {
 label: string;
 tone: "success" | "info" | "warning";
 } | null {
 const profile = getAssociationProfile(entry);
 if (!profile) {
 return null;
 }

 if (profile.structureStatus === "active_validated") {
 return { label: "Structure active / validée", tone: "success" };
 }
 if (profile.structureStatus === "validated") {
 return { label: "Structure validée", tone: "success" };
 }
 if (profile.structureStatus === "active") {
 return { label: "Structure active", tone: "info" };
 }
 return { label: "Structure à confirmer", tone: "warning" };
}

export function getAssociationImpactSummary(entry: AnnuaireEntry): string {
 const profile = getAssociationProfile(entry);
 if (!profile) {
 return "Impact associatif non disponible";
 }

 const impact = profile.impactHistory ?? {
 recurrence: "cadence à confirmer",
 };
 const actionCount =
 typeof impact.actionCount === "number" ? formatNumberLabel(impact.actionCount) : "à compléter";
 const zones = typeof impact.zonesCovered === "number" ? formatNumberLabel(impact.zonesCovered) : "à compléter";
 const recurrence = cleanText(impact.recurrence) || "cadence à confirmer";
 return `${actionCount} actions référencées · ${zones} zones · ${recurrence}`;
}

export function formatAssociationImpactDate(dateValue?: string): string {
 if (!dateValue) {
 return "Dernière action à préciser";
 }
 const days = diffInDays(dateValue);
 if (days === null) {
 return "Date d'impact invalide";
 }
 if (days <= 7) {
 return `Dernière action il y a ${days}j`;
 }
 if (days <= 30) {
 return `Dernière action récente (${days}j)`;
 }
 return `Dernière action il y a ${days}j`;
}

function profileBonus(entry: EnrichedAnnuaireEntry, profile: string): number {
 if (profile ==="benevole") {
 return entry.contributionTypes.some((value) =>
 ["accueil","materiel","logistique"].includes(value),
 )
 ? 18
 : 0;
 }
 if (profile ==="coordinateur") {
 return entry.contributionTypes.some((value) =>
 ["logistique","communication"].includes(value),
 )
 ? 16
 : 0;
 }
 if (profile ==="elu" || profile ==="admin" || profile ==="max") {
 return entry.kind ==="commerce" || entry.kind ==="entreprise" ? 14 : 8;
}
 if (profile ==="scientifique") {
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
