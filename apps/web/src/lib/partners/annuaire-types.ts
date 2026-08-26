export type EngagementType = "environnemental" | "social" | "humanitaire";

export type EntityKind =
  | "association"
  | "groupe_parole"
  | "evenement"
  | "commerce"
  | "entreprise";

export type ContributionType =
  | "materiel"
  | "logistique"
  | "accueil"
  | "financement"
  | "communication";

export type VerificationStatus = "verifie" | "en_cours" | "a_revalider";

export type QualificationStatus =
  | "partenaire_actif"
  | "contact_non_qualifie";

export type AnnuaireEntryProvenance = "editorial_seed" | "published_partner";

export type AssociationPublicCallType =
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

export type AssociationImpactHistory = {
  actionCount?: number;
  zonesCovered?: number;
  recurrence: string;
  lastActionAt?: string;
  note?: string;
};

export type AssociationProfile = {
  mission: string;
  recurringNeeds: string[];
  pastActions: string[];
  usefulResources: AssociationResource[];
  publicCalls: AssociationPublicCall[];
  impactHistory?: AssociationImpactHistory;
  structureStatus?: "active" | "validated" | "active_validated" | "pending";
};

export type EditorialAssociationProfile = Omit<
  AssociationProfile,
  "impactHistory" | "structureStatus"
> & {
  impactHistory?: never;
  structureStatus?: "pending";
};

type AnnuaireEntryShared = {
  id: string;
  name: string;
  legalIdentity: string;
  kind: EntityKind;
  scope?: "local" | "national" | "france";
  types: EngagementType[];
  description: string;
  location: string;
  lat: number;
  lng: number;
  websiteUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  coveredArrondissements: number[];
  contributionTypes: ContributionType[];
  availability: string;
  primaryChannel?: {
    platform: "site web" | "instagram" | "facebook";
    label: string;
    url: string;
  };
  isFeatured?: boolean;
  featuredReason?: string;
  tags?: string[];
  lastUpdatedAt: string;
  internalAdminContact?: {
    referentName: string;
    email: string;
    phone: string;
  };
};

export type AnnuaireEntrySeedInput = AnnuaireEntryShared & {
  verificationStatus: VerificationStatus;
  qualificationStatus: QualificationStatus;
  recentActivityAt: string;
  associationProfile?: AssociationProfile;
};

export type EditorialAnnuaireEntry = AnnuaireEntryShared & {
  provenance: "editorial_seed";
  verificationStatus: "en_cours";
  qualificationStatus: "contact_non_qualifie";
  recentActivityAt?: never;
  associationProfile?: EditorialAssociationProfile;
};

export type PublishedAnnuaireEntry = AnnuaireEntryShared & {
  provenance: "published_partner";
  verificationStatus: VerificationStatus;
  qualificationStatus: QualificationStatus;
  recentActivityAt: string;
  associationProfile?: AssociationProfile;
};

export type AnnuaireEntry = EditorialAnnuaireEntry | PublishedAnnuaireEntry;
