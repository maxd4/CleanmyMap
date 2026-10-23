import { normalizePublicWebUrl } from "@/lib/partners/onboarding-types";
import type {
  AnnuaireEntry,
  AssociationImpactHistory,
  AssociationProfile,
  AssociationPublicCall,
  AssociationResource,
  PublishedAnnuaireEntry,
} from "@/lib/partners/annuaire-types";

function cleanText(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}
function uniqueLabels(values: string[]): string[] {
  return [...new Set(values.map((value) => cleanText(value)).filter(Boolean))];
}

function diffInDays(dateValue: string): number | null {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24)));
}

function isPublishedPartner(entry: AnnuaireEntry): entry is PublishedAnnuaireEntry {
  return entry.provenance === "published_partner";
}

function buildAssociationMission(entry: AnnuaireEntry): string {
  if (entry.associationProfile?.mission) return cleanText(entry.associationProfile.mission);
  if (entry.featuredReason) return cleanText(entry.featuredReason);
  const source = cleanText(entry.description);
  return source || `Structure associative ancrée à ${entry.location}.`;
}

function buildAssociationPastActions(entry: AnnuaireEntry): string[] {
  return uniqueLabels(entry.associationProfile?.pastActions ?? []);
}

function buildAssociationPublicCalls(entry: AnnuaireEntry): AssociationPublicCall[] {
  if (entry.associationProfile?.publicCalls?.length) return entry.associationProfile.publicCalls;
  return entry.contributionTypes.map((type) => {
    switch (type) {
      case "materiel":
        return { type, label: "Appel à matériel", detail: "Prêt, don ou mise à disposition d'équipements utiles au terrain." };
      case "logistique":
        return { type: "benevoles", label: "Appel à bénévoles logistiques", detail: "Renfort pour l'organisation, la préparation et la coordination." };
      case "accueil":
        return { type: "benevoles", label: "Appel à bénévoles d'accueil", detail: "Renfort pour accueillir, orienter et accompagner les publics." };
      case "financement":
        return { type: "dons", label: "Appel aux dons", detail: "Soutien financier pour pérenniser les actions locales." };
      case "communication":
        return { type: "communication", label: "Relais de communication", detail: "Diffusion des appels, événements et besoins de terrain." };
    }
  });
}

function buildAssociationResources(entry: AnnuaireEntry): AssociationResource[] {
  if (entry.associationProfile?.usefulResources?.length) {
    return entry.associationProfile.usefulResources.flatMap((resource) => {
      const url = normalizePublicWebUrl(resource.url);
      return url ? [{ ...resource, url }] : [];
    });
  }

  const resources: AssociationResource[] = [];
  const addResource = (resource: AssociationResource) => {
    const url = normalizePublicWebUrl(resource.url);
    if (url) resources.push({ ...resource, url });
  };
  if (entry.websiteUrl) {
    addResource({ label: "Site officiel", description: "Informations publiques, agenda et ressources pratiques.", url: entry.websiteUrl });
  }
  if (entry.primaryChannel?.url && entry.primaryChannel.url !== entry.websiteUrl) {
    addResource({ label: entry.primaryChannel.label || "Canal de contact", description: `Contact via ${entry.primaryChannel.platform}.`, url: entry.primaryChannel.url });
  }
  if (entry.instagramUrl) addResource({ label: "Instagram", description: "Relais visuel et actualités de terrain.", url: entry.instagramUrl });
  if (entry.facebookUrl) addResource({ label: "Facebook", description: "Annonces, événements et relais locaux.", url: entry.facebookUrl });
  return resources;
}

function buildAssociationImpactHistory(entry: PublishedAnnuaireEntry): AssociationImpactHistory | undefined {
  return entry.associationProfile?.impactHistory;
}

function recurringNeeds(entry: AnnuaireEntry): string[] {
  if (entry.associationProfile?.recurringNeeds?.length) {
    return uniqueLabels(entry.associationProfile.recurringNeeds);
  }
  return uniqueLabels(entry.contributionTypes.map((type) => {
    switch (type) {
      case "materiel": return "Matériel";
      case "logistique": return "Bénévoles logistiques";
      case "accueil": return "Bénévoles d'accueil";
      case "financement": return "Dons";
      case "communication": return "Relais de communication";
    }
  }));
}

export function getAssociationProfile(entry: AnnuaireEntry): AssociationProfile | null {
  if (!isPublishedPartner(entry) || entry.kind !== "association") return null;
  return {
    mission: buildAssociationMission(entry),
    recurringNeeds: recurringNeeds(entry),
    pastActions: buildAssociationPastActions(entry),
    pastActionsProvenance: entry.associationProfile?.pastActionsProvenance,
    usefulResources: buildAssociationResources(entry),
    publicCalls: buildAssociationPublicCalls(entry),
    impactHistory: buildAssociationImpactHistory(entry),
    structureStatus:
      entry.associationProfile?.structureStatus ??
      (entry.verificationStatus === "verifie" ? "validated" : "pending"),
  };
}

export function getAssociationStructureBadge(entry: AnnuaireEntry): {
  label: string;
  tone: "success" | "info" | "warning";
} | null {
  const status = getAssociationProfile(entry)?.structureStatus;
  if (!status) return null;
  if (status === "active_validated" || status === "validated") {
    return { label: status === "validated" ? "Structure validée" : "Structure active / validée", tone: "success" };
  }
  return status === "active"
    ? { label: "Structure active", tone: "info" }
    : { label: "Structure à confirmer", tone: "warning" };
}

export function getAssociationImpactSummary(entry: AnnuaireEntry): string {
  const impact = getAssociationProfile(entry)?.impactHistory;
  if (!impact?.provenance?.source?.trim()) return "Impact mesuré non renseigné";
  const actionCount = typeof impact.actionCount === "number" ? `${impact.actionCount} action${impact.actionCount === 1 ? "" : "s"} mesurée${impact.actionCount === 1 ? "" : "s"}` : "Mesure disponible";
  const zones = typeof impact.zonesCovered === "number" ? `${impact.zonesCovered} zone${impact.zonesCovered === 1 ? "" : "s"}` : null;
  const recurrence = cleanText(impact.recurrence);
  return [actionCount, zones, recurrence || null].filter(Boolean).join(" · ");
}

export function formatAssociationImpactDate(dateValue?: string): string {
  if (!dateValue) return "Date de dernière action non renseignée";
  const days = diffInDays(dateValue);
  if (days === null) return "Date d’activité non valide";
  if (days <= 30) return `${days <= 7 ? `Il y a ${days}j` : `Récente (${days}j)`}`;
  return `Il y a ${days}j`;
}

export function hasTraceableImpactHistory(entry: AnnuaireEntry): boolean {
  return Boolean(getAssociationProfile(entry)?.impactHistory?.provenance?.source?.trim());
}

export function hasTraceablePastActions(entry: AnnuaireEntry): boolean {
  const profile = getAssociationProfile(entry);
  return Boolean(profile?.pastActions.length && profile.pastActionsProvenance?.source?.trim());
}
