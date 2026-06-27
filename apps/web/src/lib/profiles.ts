import type { Locale } from "@/lib/ui/preferences";
import type { RubriqueSpaceId } from "@/lib/sections-registry";
import type { Parcours, Role, SessionRole } from "@/lib/domain-language";
import { buildProfileRoute } from "@/lib/accueil-pilotage-routes";
import { PROFILE_CTA_CONFIG, type ProfileAction } from "./profiles-cta";
export type { ProfileAction, ProfileCtaConfig } from "./profiles-cta";

// Alias legacy conservés pour compatibilité; vocabulaire canonique: Role/Parcours/SessionRole.
export type AppProfile = Parcours;
export type AppRoleLabel = SessionRole;
export type DisplayNameMode = "full_name" | "pseudo";

type Localized = Record<Locale, string>;

type ProfileDefinition = {
  id: Parcours;
  label: Localized;
  subtitle: Localized;
  spacePriority: Record<RubriqueSpaceId, number>;
};

export function normalizeDisplayNameMode(
  mode: string | null | undefined,
): DisplayNameMode {
  return mode === "pseudo" ? "pseudo" : "full_name";
}

export function resolveAccountDisplayName(params: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  userId: string;
  mode?: DisplayNameMode | null;
}): string {
  const firstName = params.firstName?.trim() ?? "";
  const lastName = params.lastName?.trim() ?? "";
  const fullName = `${firstName} ${lastName}`.trim();
  const pseudo = params.username?.trim() ?? "";
  const mode = normalizeDisplayNameMode(params.mode);

  if (mode === "pseudo") {
    return pseudo || fullName || params.userId;
  }

  return fullName || pseudo || params.userId;
}

export const PROFILE_ORDER: AppProfile[] = [
  "benevole",
  "coordinateur",
  "scientifique",
  "entreprise",
  "elu",
  "admin",
  "max",
];

export const SELF_SERVICE_PROFILE_ORDER = [
  "benevole",
  "coordinateur",
  "scientifique",
  "entreprise",
] as const satisfies readonly AppProfile[];

export type SelfServiceProfile = (typeof SELF_SERVICE_PROFILE_ORDER)[number];

export const PROFILE_DEFINITIONS: Record<AppProfile, ProfileDefinition> = {
  benevole: {
    id: "benevole",
    label: { fr: "Bénévole", en: "Volunteer" },
    subtitle: {
      fr: "Déclaration terrain et suivi local",
      en: "Field declaration and local follow-up",
    },
    spacePriority: { execute: 1, supervise: 2, decide: 3, prepare: 4 },
  },
  coordinateur: {
    id: "coordinateur",
    label: { fr: "Coordination", en: "Coordination" },
    subtitle: {
      fr: "Organisation des actions collectives",
      en: "Collective action coordination",
    },
    spacePriority: { execute: 1, supervise: 2, decide: 3, prepare: 4 },
  },
  scientifique: {
    id: "scientifique",
    label: { fr: "Scientifique", en: "Scientist" },
    subtitle: {
      fr: "Analyse des données et évidence statistique",
      en: "Data analysis and statistical evidence",
    },
    spacePriority: { decide: 1, supervise: 2, prepare: 3, execute: 4 },
  },
  entreprise: {
    id: "entreprise",
    label: { fr: "Entreprise", en: "Business" },
    subtitle: {
      fr: "Partenariats et mécénat d'entreprise",
      en: "Partnerships and corporate sponsorship",
    },
    spacePriority: { decide: 1, supervise: 2, prepare: 3, execute: 4 },
  },
  elu: {
    id: "elu",
    label: { fr: "Elu", en: "Local authority" },
    subtitle: {
      fr: "Pilotage institutionnel et décisionnel",
      en: "Institutional and decision oversight",
    },
    spacePriority: { decide: 1, supervise: 2, prepare: 3, execute: 4 },
  },
  admin: {
    id: "admin",
    label: { fr: "Administration", en: "Administration" },
    subtitle: {
      fr: "Modération et supervision",
      en: "Moderation and supervision",
    },
    spacePriority: { supervise: 1, execute: 2, decide: 3, prepare: 4 },
  },
  max: {
    id: "max",
    label: { fr: "IMU", en: "IMU" },
    subtitle: {
      fr: "Supervision propriétaire et arbitrage final",
      en: "Owner supervision and final arbitration",
    },
    spacePriority: { supervise: 1, execute: 2, decide: 3, prepare: 4 },
  },
};

const ROLE_ALIASES: Record<string, Role> = {
  admin: "admin",
  administrator: "admin",
  max: "max",
  imu: "max",
  owner: "max",
  superadmin: "max",
  super_admin: "max",
  "super-admin": "max",
  godmode: "max",
  creator: "max",
  createur: "max",
  createur_du_site: "max",
  "créateur du site": "max",
  benevole: "benevole",
  volunteer: "benevole",
  user: "benevole",
  member: "benevole",
  coordinateur: "coordinateur",
  coordinator: "coordinateur",
  coordonnateur: "coordinateur",
  scientifique: "scientifique",
  scientist: "scientifique",
  data: "scientifique",
  analyste: "scientifique",
  analyst: "scientifique",
  statisticien: "scientifique",
  statistician: "scientifique",
  entreprise: "entreprise",
  company: "entreprise",
  business: "entreprise",
  professionnel: "entreprise",
  professionnelle: "entreprise",
  professional: "entreprise",
  elu: "elu",
  elue: "elu",
  decideur: "elu",
  "décideur": "elu",
  elected: "elu",
  mayor: "elu",
};

export function normalizeProfileRole(
  input: string | null | undefined,
): Role | null {
  const normalized = (input ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return ROLE_ALIASES[normalized] ?? null;
}

export function resolveProfile(params: {
  metadataRole: string | null | undefined;
  isMax: boolean;
  isAdmin: boolean;
}): Role {
  if (params.isMax) {
    return "max";
  }
  if (params.isAdmin) {
    return "admin";
  }
  return normalizeProfileRole(params.metadataRole) ?? "benevole";
}

export function toProfile(role: AppRoleLabel): AppProfile {
  if (role === "anonymous") {
    return "benevole";
  }
  return role;
}

export function isAdminLikeProfile(profile: AppProfile): boolean {
  return profile === "admin" || profile === "max";
}

export function getSwitchableProfiles(
  profile: AppProfile,
): AppProfile[] {
  if (profile === "max") {
    return [...PROFILE_ORDER];
  }
  if (profile === "admin") {
    return PROFILE_ORDER.filter((item) => item !== "max");
  }
  if (isSelfServiceProfile(profile)) {
    return [...SELF_SERVICE_PROFILE_ORDER];
  }
  return [profile];
}

export function getProfileEntryPath(profile: AppProfile): string {
  return buildProfileRoute(profile);
}

export function isSelfServiceProfile(
  profile: string,
): profile is SelfServiceProfile {
  return (SELF_SERVICE_PROFILE_ORDER as readonly string[]).includes(profile);
}

export function cycleSelfServiceProfile(
  current: AppProfile,
): SelfServiceProfile {
  const index = SELF_SERVICE_PROFILE_ORDER.indexOf(
    current as SelfServiceProfile,
  );
  return (
    SELF_SERVICE_PROFILE_ORDER[
      (index + 1) % SELF_SERVICE_PROFILE_ORDER.length
    ] ?? SELF_SERVICE_PROFILE_ORDER[0]
  );
}

export function getProfileLabel(profile: AppProfile, locale: Locale): string {
  return PROFILE_DEFINITIONS[profile].label[locale];
}

export function getProfileSubtitle(
  profile: AppProfile,
  locale: Locale,
): string {
  return PROFILE_DEFINITIONS[profile].subtitle[locale];
}

export function getProfileActions(profile: AppProfile): ProfileAction[] {
  const config = PROFILE_CTA_CONFIG[profile];
  const actions: ProfileAction[] = [config.primaryCTA];
  if (config.secondaryCTA) {
    actions.push(config.secondaryCTA);
  }
  return [...actions, ...(config.additionalActions ?? [])];
}

export function getProfilePrimaryAction(profile: AppProfile): ProfileAction {
  return PROFILE_CTA_CONFIG[profile].primaryCTA;
}

export function getProfileSecondaryAction(
  profile: AppProfile,
): ProfileAction | null {
  return PROFILE_CTA_CONFIG[profile].secondaryCTA ?? null;
}

export function getProfileSpacePriority(
  profile: AppProfile,
  spaceId: RubriqueSpaceId,
): number {
  return PROFILE_DEFINITIONS[profile].spacePriority[spaceId];
}

export function isAppProfile(value: string): value is AppProfile {
  return PROFILE_ORDER.includes(value as AppProfile);
}

