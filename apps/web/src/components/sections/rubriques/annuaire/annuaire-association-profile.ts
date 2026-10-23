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

function hasRecentPartnerUpdate(entry: AnnuaireEntry): boolean {
  return isPublishedPartner(entry) && (diffInDays(entry.lastUpdatedAt) ?? Infinity) <= 90;
}

function buildAssociationMission(entry: AnnuaireEntry): string {
  if (entry.associationProfile?.mission) return cleanText(entry.associationProfile.mission);
  if (entry.featuredReason) return cleanText(entry.featuredReason);
  const source = cleanText(entry.description);
  return source || `Structure associative ancrée à ${entry.location}.`;
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

function buildAssociationImpactHistory(entry: PublishedAnnuaireEntry): AssociationImpactHistory {
  if (entry.associationProfile?.impactHistory) return entry.associationProfile.impactHistory;
  const availability = entry.availability.toLowerCase();
  const recurrence = availability.includes("hebdo") || availability.includes("réguli")
    ? "Actions récurrentes"
    : availability.includes("ponct")
      ? "Actions ponctuelles"
      : "Cadence à confirmer";
  return {
    zonesCovered: entry.coveredArrondissements.length,
    recurrence,
    lastActionAt: entry.recentActivityAt,
    note: "Historique local à enrichir avec les actions déclarées.",
  };
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
  if (!impact) return "Impact associatif non disponible";
  const actionCount = typeof impact.actionCount === "number" ? `${impact.actionCount}` : "à compléter";
  const zones = typeof impact.zonesCovered === "number" ? `${impact.zonesCovered}` : "à compléter";
  return `${actionCount} actions référencées · ${zones} zones · ${cleanText(impact.recurrence) || "cadence à confirmer"}`;
}

export function formatAssociationImpactDate(dateValue?: string): string {
  if (!dateValue) return "Dernière action à préciser";
  const days = diffInDays(dateValue);
  if (days === null) return "Date d'impact invalide";
  if (days <= 30) return `Dernière action ${days <= 7 ? `il y a ${days}j` : `récente (${days}j)`}`;
  return `Dernière action il y a ${days}j`;
}
