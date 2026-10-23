import { randomUUID } from "node:crypto";
import {
  formatAvailabilitySummary,
  formatCoverageSummary,
  formatPartnerScopeLabel,
  normalizePartnerAvailability,
  normalizePartnerCoverage,
  type PartnerOnboardingRequestInput,
} from "./onboarding-types";
import type { AnnuaireEntry, AssociationProfile, AssociationPublicCall, AssociationResource } from "./annuaire-types";
import type { PublishedPartnerAnnuaireEntry } from "./published-annuaire-entries-store";

function organizationTypesToEngagementTypes(organizationType: PartnerOnboardingRequestInput["organizationType"]): AnnuaireEntry["types"] {
  if (organizationType === "commerce") return ["social"];
  if (organizationType === "entreprise") return ["environnemental", "social"];
  return ["social", "environnemental"];
}

function organizationTypeToKind(organizationType: PartnerOnboardingRequestInput["organizationType"]): AnnuaireEntry["kind"] {
  if (organizationType === "association") return "association";
  if (organizationType === "commerce") return "commerce";
  if (organizationType === "entreprise") return "entreprise";
  return "groupe_parole";
}

function buildAssociationPublicCalls(contributionTypes: PartnerOnboardingRequestInput["contributionTypes"], relayActions: string): AssociationPublicCall[] {
  const calls: AssociationPublicCall[] = contributionTypes.map((type) => {
    if (type === "materiel") return { type: "materiel", label: "Appel à matériel", detail: "Prêt, don ou mise à disposition d'équipements utiles au terrain." };
    if (type === "financement") return { type: "dons", label: "Appel aux dons", detail: "Soutien financier pour consolider les actions locales." };
    if (type === "communication") return { type: "communication", label: "Relais de communication", detail: "Diffusion des appels et des événements locaux." };
    return { type: "benevoles", label: "Appel à bénévoles", detail: "Renfort humain pour coordonner et déployer les actions." };
  });
  if (relayActions.trim()) calls.push({ type: "communication", label: "Relais de communication", detail: relayActions.trim() });
  return calls;
}

function buildAssociationRecurringNeeds(contributionTypes: PartnerOnboardingRequestInput["contributionTypes"]): string[] {
  const needs = contributionTypes.map((type) => {
    if (type === "materiel") return "Matériel";
    if (type === "financement") return "Dons";
    if (type === "communication") return "Relais de communication";
    if (type === "logistique") return "Bénévoles logistiques";
    return "Bénévoles d'accueil";
  });
  return [...new Set(needs)];
}

function buildAssociationResources(params: { websiteUrl?: string | null; primaryChannelUrl?: string | null; primaryChannelLabel?: string; instagramUrl?: string | null; facebookUrl?: string | null }): AssociationResource[] {
  const resources: AssociationResource[] = [];
  if (params.websiteUrl) resources.push({ label: "Site officiel", description: "Agenda public et informations utiles.", url: params.websiteUrl });
  if (params.primaryChannelUrl && params.primaryChannelUrl !== params.websiteUrl) resources.push({ label: params.primaryChannelLabel?.trim() || "Canal de contact", description: "Lien public fourni indépendamment du contact administratif.", url: params.primaryChannelUrl });
  if (params.instagramUrl) resources.push({ label: "Instagram", description: "Actualités, campagnes et relais visuels.", url: params.instagramUrl });
  if (params.facebookUrl) resources.push({ label: "Facebook", description: "Annonces, événements et mobilisations.", url: params.facebookUrl });
  return resources;
}

function buildPublishedAssociationProfile(request: PartnerOnboardingRequestInput, availability: ReturnType<typeof normalizePartnerAvailability>, coveredArrondissements: readonly number[], nowIso: string): AssociationProfile | undefined {
  if (request.organizationType !== "association") return undefined;
  const relay = request.relayActions.trim();
  return {
    mission: [request.motivation.trim(), relay ? `Relais déclaré: ${relay}` : null].filter(Boolean).join(" · "),
    recurringNeeds: buildAssociationRecurringNeeds(request.contributionTypes),
    pastActions: [],
    usefulResources: buildAssociationResources({ websiteUrl: null, primaryChannelUrl: null, primaryChannelLabel: request.contactChannel, instagramUrl: null, facebookUrl: null }),
    publicCalls: buildAssociationPublicCalls(request.contributionTypes, request.relayActions),
    impactHistory: { zonesCovered: coveredArrondissements.length, recurrence: formatAvailabilitySummary(availability), lastActionAt: nowIso, note: "Historique d'impact à compléter après validation." },
    structureStatus: "pending",
  };
}

function contributionTag(type: PartnerOnboardingRequestInput["contributionTypes"][number]): string {
  if (type === "materiel") return "Matériel";
  if (type === "logistique") return "Logistique";
  if (type === "accueil") return "Accueil";
  if (type === "financement") return "Financement";
  return "Communication";
}

export function buildPublishedPartnerAnnuaireEntry(params: { request: PartnerOnboardingRequestInput; requestId: string }): PublishedPartnerAnnuaireEntry {
  const coverage = normalizePartnerCoverage(params.request.coverage);
  const availability = normalizePartnerAvailability(params.request.availability);
  const arrondissements = params.request.partnerScope === "local" ? coverage.arrondissements : [];
  const publicChannelUrl = null;
  const websiteUrl = null;
  const nowIso = new Date().toISOString();
  const associationProfile = buildPublishedAssociationProfile(params.request, availability, arrondissements, nowIso);
  return {
    id: `onboarded-${randomUUID()}`,
    sourceRequestId: params.requestId,
    source: "partner_onboarding",
    publicationStatus: "pending_admin_review",
    publishedAt: nowIso,
    name: params.request.organizationName,
    legalIdentity: params.request.legalIdentity,
    kind: organizationTypeToKind(params.request.organizationType),
    types: organizationTypesToEngagementTypes(params.request.organizationType),
    scope: params.request.partnerScope,
    description: [params.request.motivation.slice(0, 220), params.request.relayActions.trim() ? `Relais: ${params.request.relayActions.trim()}` : null].filter(Boolean).join(" · "),
    location: params.request.partnerScope === "local" ? formatCoverageSummary(coverage) : formatPartnerScopeLabel(params.request.partnerScope),
    lat: null,
    lng: null,
    coordinatesSource: "derived_coverage",
    websiteUrl: websiteUrl ?? undefined,
    coveredArrondissements: arrondissements,
    contributionTypes: params.request.contributionTypes,
    availability: formatAvailabilitySummary(availability),
    tags: [params.request.partnerScope === "local" ? "Réseau local" : formatPartnerScopeLabel(params.request.partnerScope), ...params.request.contributionTypes.map(contributionTag)],
    primaryChannel: publicChannelUrl ? { platform: "site web", label: params.request.contactChannel.trim() || "Contact direct", url: publicChannelUrl } : undefined,
    verificationStatus: "en_cours",
    qualificationStatus: "contact_non_qualifie",
    provenance: "published_partner",
    lastUpdatedAt: nowIso,
    recentActivityAt: nowIso,
    associationProfile,
    internalAdminContact: {
      referentName: params.request.contactName,
      email: params.request.contactDetails.includes("@") ? params.request.contactDetails : "non communiqué",
      phone: params.request.contactDetails.includes("@") ? "non communiqué" : params.request.contactDetails,
    },
  };
}
