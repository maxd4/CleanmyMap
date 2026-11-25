import type { SchoolIdentityProfile } from "./annuaire-types";

export type ParisActorCategory =
  | "association_locale"
  | "entreprise_rse"
  | "collectivite_mairie"
  | "reseau_evenement"
  | "plateforme_mise_en_relation"
  | "etablissement_enseignement";

export type ParisActorOperationalRole =
  | "organisateur_effectif"
  | "relais"
  | "financeur"
  | "fournisseur_materiel";

export type ParisEcosystemRole =
  | "organisateur_direct"
  | "coordinateur_reseau"
  | "plateforme_publication"
  | "sensibilisation_prevention";

export type ParticipationModality =
  | "benevoles"
  | "entreprises_rse"
  | "scolaires";

export type EquipmentStatus =
  | "fournit_materiel"
  | "kit_ou_guide"
  | "non_attribue"
  | "incertain";

export type VerificationCertainty = "verifie" | "partiel_ou_incertain";

export type ParisRelationType =
  | "action_commune"
  | "publie_sur"
  | "partenariat"
  | "soutien_rse"
  | "appui_logistique"
  | "presence_evenement"
  | "collaboration_programmee";

export type PublicChannelType =
  | "site_officiel"
  | "inscription_evenement"
  | "plateforme_jagis"
  | "plateforme_jeveuxaider"
  | "plateforme_cleanwalk"
  | "plateforme_helloasso"
  | "reseau_facebook"
  | "reseau_instagram"
  | "reseau_linkedin"
  | "groupe_whatsapp"
  | "groupe_discord"
  | "autre_public";

export interface ParisActorEquipment {
  status: EquipmentStatus;
  summary: string;
  items?: string[];
  sourceUrl?: string;
  certainty: VerificationCertainty;
}

export interface ParisActorPublicContact {
  label: string;
  url?: string;
  email?: string;
  certainty: VerificationCertainty;
}

export interface ParisActorPublicLeader {
  name: string;
  roleTitle: string;
  sourceUrl: string;
  verifiedAt: string;
}

export interface ParisActorPublicChannel {
  type: PublicChannelType;
  label: string;
  url: string;
  provenance: {
    sourceLabel: string;
    sourceUrl: string;
    verifiedAt: string;
    certainty: VerificationCertainty;
  };
}

export interface ParisActorProvenance {
  sourceLabel: string;
  sourceUrl: string;
  secondarySourceUrl?: string;
  certainty: VerificationCertainty;
}

export interface ParisActorFundingSource {
  label: string;
  /** Pourcentage publié (0..100). Toujours null/undefined si inconnu — ne jamais assimiler à 0. */
  sharePercent?: number | null;
  /** Montant en euros publié si connu. */
  amountEur?: number | null;
}

export interface ParisActorFunding {
  sources: ParisActorFundingSource[];
  sharesPublished: boolean;
  period?: string;
  entityName: string;
  calculationBase?: string;
  sourceUrl: string;
  verifiedAt: string;
  notes?: string;
}

export interface ParisCleanwalkActor {
  /**
   * Canonical identifier. Reuses the Annuaire seed ID when the actor already
   * exists in INITIAL_ANNUAIRE_ENTRIES to avoid a competing organization registry.
   */
  id: string;
  annuaireEntryId?: string;
  organizerDirectoryId?: string;
  name: string;
  category: ParisActorCategory;
  roles: ParisActorOperationalRole[];
  ecosystemRoles: ParisEcosystemRole[];
  publicLeader: ParisActorPublicLeader | null;
  schoolProfile?: SchoolIdentityProfile;
  officialWebsite: string;
  publicContact: ParisActorPublicContact | null;
  publicChannels: ParisActorPublicChannel[];
  platformStatus?: {
    isPlatform: true;
    v2UnavailableFeaturesNote?: string;
  };
  parisZone: {
    label: string;
    arrondissements: number[];
    isIntramuros: boolean;
    scopeNote?: string;
  };
  participationModalities: ParticipationModality[];
  equipmentAvailability: ParisActorEquipment;
  activities: string[];
  funding?: ParisActorFunding;
  provenance: ParisActorProvenance;
  verifiedAt: string;
  isCleanMyMapMember: false;
}

export interface ProvenJointOperation {
  id: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  label: string;
  sourceUrl: string;
}

interface ParisCleanwalkRelationBase {
  id: string;
  sourceId: string;
  targetId: string;
  title: string;
  summary: string;
  /**
   * Distinct proven operations for `action_commune`.
   * When undefined or empty with `frequencyKnown: false`, thickness uses the
   * neutral fallback instead of inventing 0.
   */
  operations?: ProvenJointOperation[];
  frequencyKnown: boolean;
}

export interface HistoricalParisCleanwalkRelation extends ParisCleanwalkRelationBase {
  relationType: Exclude<ParisRelationType, "collaboration_programmee">;
  operationId?: never;
  source: { label: string; url: string; verifiedAt: string; certainty: VerificationCertainty };
}

export interface ScheduledParisCleanwalkRelation extends ParisCleanwalkRelationBase {
  relationType: "collaboration_programmee";
  operationId: string;
  operations?: never;
  frequencyKnown: false;
  source: { label: string; url: null; declaredOn: string; certainty: "partiel_ou_incertain"; provenance: "declaration_organisateur" };
}

export type ParisCleanwalkRelation = HistoricalParisCleanwalkRelation | ScheduledParisCleanwalkRelation;

export const RELATION_THICKNESS_POLICY = {
  minThickness: 1.5,
  maxThickness: 6.0,
  neutralThickness: 2.0,
  otherRelationThickness: 1.8,
  maxOperationsScale: 12,
  rollingWindowDays: 365,
} as const;

export function getCurrentReferenceDateIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export {
  isPrivateOrUnauthorizedInviteUrl,
  isSafeHttpUrl,
  sanitizeAndDeduplicatePublicChannels,
} from "./paris-cleanwalk-network.channels";

/**
 * Counts distinct proven operations within the 12-month rolling window ending
 * on `referenceDateIso`. Returns `null` when frequency is unknown so callers
 * never invent `0`.
 */
export function countDistinctOperationsLast12Months(
  relation: Pick<ParisCleanwalkRelation, "relationType" | "operations" | "frequencyKnown">,
  referenceDateIso: string = getCurrentReferenceDateIso(),
): number | null {
  if (relation.relationType !== "action_commune") {
    return null;
  }
  if (!relation.frequencyKnown || !relation.operations) {
    return null;
  }

  const refMs = Date.parse(`${referenceDateIso}T23:59:59.999Z`);
  if (Number.isNaN(refMs)) {
    return null;
  }
  const windowStartMs =
    refMs - RELATION_THICKNESS_POLICY.rollingWindowDays * 24 * 60 * 60 * 1000;

  const seenKeys = new Set<string>();
  for (const op of relation.operations) {
    const opMs = Date.parse(`${op.date}T12:00:00.000Z`);
    if (Number.isNaN(opMs) || opMs < windowStartMs || opMs > refMs) {
      continue;
    }
    const dedupeKey = `${op.id.trim().toLowerCase()}::${op.date}`;
    seenKeys.add(dedupeKey);
  }

  return seenKeys.size;
}

/**
 * Computes link thickness using a bounded linear scale for `action_commune`
 * with known frequency, neutral thickness when frequency is unknown, and a
 * distinct fixed thickness for non-operational relations.
 */
export function computeRelationThickness(
  relation: Pick<ParisCleanwalkRelation, "relationType" | "operations" | "frequencyKnown">,
  referenceDateIso: string = getCurrentReferenceDateIso(),
): {
  thickness: number;
  operationsCount12m: number | null;
  isNeutralFallback: boolean;
} {
  if (relation.relationType !== "action_commune") {
    return {
      thickness: RELATION_THICKNESS_POLICY.otherRelationThickness,
      operationsCount12m: null,
      isNeutralFallback: false,
    };
  }

  const count = countDistinctOperationsLast12Months(relation, referenceDateIso);
  if (count === null || count === 0) {
    return {
      thickness: RELATION_THICKNESS_POLICY.neutralThickness,
      operationsCount12m: count,
      isNeutralFallback: true,
    };
  }

  const { minThickness, maxThickness, maxOperationsScale } =
    RELATION_THICKNESS_POLICY;
  const clamped = Math.min(Math.max(count, 1), maxOperationsScale);
  const ratio = (clamped - 1) / (maxOperationsScale - 1);
  const thickness = Number((minThickness + ratio * (maxThickness - minThickness)).toFixed(2));

  return {
    thickness,
    operationsCount12m: count,
    isNeutralFallback: false,
  };
}

export const PARIS_ACTOR_CATEGORY_META: Record<
  ParisActorCategory,
  { label: string; shortLabel: string; colorHex: string }
> = {
  etablissement_enseignement: { label: "Établissements scolaires", shortLabel: "Écoles et lycées", colorHex: "#34d399" },
  association_locale: {
    label: "Associations et collectifs locaux",
    shortLabel: "Associations",
    colorHex: "#8b5cf6",
  },
  entreprise_rse: {
    label: "Entreprises, soutiens RSE et éco-organismes",
    shortLabel: "Entreprises / Éco-organismes",
    colorHex: "#6366f1",
  },
  collectivite_mairie: {
    label: "Collectivités, mairies et propreté",
    shortLabel: "Collectivités",
    colorHex: "#a855f7",
  },
  reseau_evenement: {
    label: "Événements et réseaux nationaux/internationaux",
    shortLabel: "Réseaux / Événements",
    colorHex: "#c084fc",
  },
  plateforme_mise_en_relation: {
    label: "Plateformes de publication et mise en relation",
    shortLabel: "Plateformes",
    colorHex: "#38bdf8",
  },
};

export const PARIS_ACTOR_ROLE_LABELS: Record<ParisActorOperationalRole, string> = {
  organisateur_effectif: "Organisateur effectif",
  relais: "Relais",
  financeur: "Financeur",
  fournisseur_materiel: "Fournisseur de matériel",
};

export const PARIS_ECOSYSTEM_ROLE_LABELS: Record<ParisEcosystemRole, string> = {
  organisateur_direct: "Organisateur direct",
  coordinateur_reseau: "Coordinateur de réseau",
  plateforme_publication: "Plateforme de publication",
  sensibilisation_prevention: "Sensibilisation & prévention",
};

export const PUBLIC_CHANNEL_TYPE_LABELS: Record<PublicChannelType, string> = {
  site_officiel: "Site officiel",
  inscription_evenement: "Inscription événement",
  plateforme_jagis: "J'agis pour la nature",
  plateforme_jeveuxaider: "JeVeuxAider.gouv.fr",
  plateforme_cleanwalk: "Cleanwalk.org",
  plateforme_helloasso: "HelloAsso",
  reseau_facebook: "Facebook",
  reseau_instagram: "Instagram",
  reseau_linkedin: "LinkedIn",
  groupe_whatsapp: "Groupe WhatsApp public",
  groupe_discord: "Serveur Discord public",
  autre_public: "Canal public",
};

export const PARIS_RELATION_TYPE_META: Record<
  ParisRelationType,
  { label: string; colorHex: string; dashPattern: "solid" | "dashed" | "dotted" }
> = {
  collaboration_programmee: { label: "Collaboration programmée (déclarée)", colorHex: "#fbbf24", dashPattern: "dashed" },
  action_commune: {
    label: "Coorganise avec / action commune prouvée",
    colorHex: "#c4b5fd",
    dashPattern: "solid",
  },
  publie_sur: {
    label: "Publie ses actions sur",
    colorHex: "#38bdf8",
    dashPattern: "dotted",
  },
  partenariat: {
    label: "Partenariat documenté",
    colorHex: "#818cf8",
    dashPattern: "dashed",
  },
  soutien_rse: {
    label: "Soutien RSE",
    colorHex: "#a78bfa",
    dashPattern: "dashed",
  },
  appui_logistique: {
    label: "Appui logistique",
    colorHex: "#ddd6fe",
    dashPattern: "dotted",
  },
  presence_evenement: {
    label: "Présence à un événement",
    colorHex: "#94a3b8",
    dashPattern: "dotted",
  },
};

export const PARTICIPATION_MODALITY_LABELS: Record<ParticipationModality, string> = {
  benevoles: "Bénévoles",
  entreprises_rse: "Entreprises / RSE",
  scolaires: "Scolaires",
};

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  fournit_materiel: "Fournit du matériel",
  kit_ou_guide: "Kit / guide uniquement",
  non_attribue: "Aucun prêt attribué",
  incertain: "Non confirmé / variable",
};

export { PARIS_CLEANWALK_ACTORS } from "./paris-cleanwalk-network.data";
export { PARIS_CLEANWALK_RELATIONS } from "./paris-cleanwalk-network.relations";
