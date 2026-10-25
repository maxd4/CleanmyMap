type EngagementType = "environnemental" | "social" | "humanitaire";

export type AnnuaireEngagementTypesSource =
  | "editorial_seed"
  | "partner_declaration";

type EntityKind =
  | "association"
  | "groupe_parole"
  | "evenement"
  | "commerce"
  | "entreprise";

type ContributionType =
  | "materiel"
  | "logistique"
  | "accueil"
  | "financement"
  | "communication";

type VerificationStatus = "verifie" | "en_cours" | "a_revalider";

type QualificationStatus =
  | "partenaire_actif"
  | "contact_non_qualifie";

type AssociationPublicCallType =
  | "benevoles"
  | "dons"
  | "communication"
  | "materiel";

export type AssociationPublicCall = {
  type: AssociationPublicCallType;
  label: string;
  detail?: string;
};

export type AssociationResource = {
  label: string;
  description?: string;
  url?: string;
};

type AssociationEvidence = {
  source: string;
  reference?: string;
};

export type AssociationImpactHistory = {
  actionCount?: number;
  zonesCovered?: number;
  recurrence?: string;
  lastActionAt?: string;
  note?: string;
  provenance?: AssociationEvidence;
};

export type AssociationProfile = {
  mission: string;
  recurringNeeds: string[];
  pastActions: string[];
  usefulResources: AssociationResource[];
  publicCalls: AssociationPublicCall[];
  impactHistory?: AssociationImpactHistory;
  pastActionsProvenance?: AssociationEvidence;
  structureStatus?: "active" | "validated" | "active_validated" | "pending";
};

type EditorialAssociationProfile = Omit<
  AssociationProfile,
  "impactHistory" | "structureStatus"
> & {
  impactHistory?: never;
  structureStatus?: never;
};

type AnnuaireEntryShared = {
  id: string;
  name: string;
  legalIdentity: string;
  kind: EntityKind;
  scope?: "local" | "national" | "france";
  types: EngagementType[];
  /**
   * The legacy `types` values remain available to existing badges and map
   * popups. Only values carrying this provenance are admissible for the
   * thematic directory filter.
   */
  engagementTypesSource?: AnnuaireEngagementTypesSource;
  description: string;
  location: string;
  /**
   * Coordinates are nullable because a coverage area is not an organisation
   * address. Derived coverage coordinates are retained only as provenance
   * metadata and are never eligible for a precise public marker.
   */
  lat: number | null;
  lng: number | null;
  coordinatesSource?: "verified" | "derived_coverage" | "unknown";
  websiteUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  coveredArrondissements: number[];
  contributionTypes: ContributionType[];
  availability?: string;
  primaryChannel?: {
    platform: "site web" | "instagram" | "facebook";
    label: string;
    url: string;
  };
  isFeatured?: boolean;
  featuredReason?: string;
  tags?: string[];
};

type InternalAdminContact = {
  referentName: string;
  email: string;
  phone: string;
};

export type AnnuaireEntrySeedInput = Omit<AnnuaireEntryShared, "availability"> & {
  associationProfile?: EditorialAssociationProfile;
};

export type EditorialAnnuaireEntry = AnnuaireEntryShared & {
  provenance: "editorial_seed";
  verificationStatus: "en_cours";
  qualificationStatus: "contact_non_qualifie";
  availability?: never;
  lastUpdatedAt?: never;
  recentActivityAt?: never;
  associationProfile?: EditorialAssociationProfile;
};

export type PublishedAnnuaireEntry = AnnuaireEntryShared & {
  provenance: "published_partner";
  verificationStatus: VerificationStatus;
  qualificationStatus: QualificationStatus;
  availability: string;
  lastUpdatedAt: string;
  /** Optional legacy field; it is never treated as activity evidence. */
  recentActivityAt?: string;
  /** Server-side administrative data; never part of editorial seed projections. */
  internalAdminContact?: InternalAdminContact;
  /**
   * Explicit bridge to the canonical action organizer registry.
   * Names are never used to infer this relationship.
   */
  organizerDirectoryId?: string;
  associationProfile?: AssociationProfile;
};

export type AnnuaireEntry = EditorialAnnuaireEntry | PublishedAnnuaireEntry;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isPublishedAnnuaireEntry(value: unknown): value is PublishedAnnuaireEntry {
  if (!isRecord(value)) return false;
  const record = value;
  const isStringArray = (candidate: unknown): candidate is string[] => Array.isArray(candidate) && candidate.every((item) => typeof item === "string");
  const isNumberArray = (candidate: unknown): candidate is number[] => Array.isArray(candidate) && candidate.every((item) => typeof item === "number" && Number.isFinite(item));
  return typeof record.id === "string" && typeof record.name === "string" && typeof record.legalIdentity === "string" && (record.kind === "association" || record.kind === "groupe_parole" || record.kind === "evenement" || record.kind === "commerce" || record.kind === "entreprise") && (record.scope === undefined || record.scope === "local" || record.scope === "national" || record.scope === "france") && isStringArray(record.types) && typeof record.description === "string" && typeof record.location === "string" && (record.lat === null || (typeof record.lat === "number" && Number.isFinite(record.lat))) && (record.lng === null || (typeof record.lng === "number" && Number.isFinite(record.lng))) && isNumberArray(record.coveredArrondissements) && isStringArray(record.contributionTypes) && record.provenance === "published_partner" && (record.verificationStatus === "verifie" || record.verificationStatus === "en_cours" || record.verificationStatus === "a_revalider") && (record.qualificationStatus === "partenaire_actif" || record.qualificationStatus === "contact_non_qualifie") && typeof record.availability === "string" && typeof record.lastUpdatedAt === "string";
}
