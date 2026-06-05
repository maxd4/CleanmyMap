import type { Locale } from "@/lib/ui/preferences";
import type { RubriqueSpaceId } from "@/lib/sections-registry";
import type { Parcours, Role, SessionRole } from "@/lib/domain-language";
import {
  ADMIN_GODMODE_ROUTE,
  ADMIN_ROUTE,
  DASHBOARD_ROUTE,
  REPORTS_ROUTE,
  SPONSOR_PORTAL_ROUTE,
  buildProfileRoute,
} from "@/lib/accueil-pilotage-routes";

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

export type ProfileAction = {
  href: string;
  label: Localized;
  description: Localized;
};

export type ProfileCtaConfig = {
  primaryCTA: ProfileAction;
  secondaryCTA?: ProfileAction;
  additionalActions?: ProfileAction[];
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

const PROFILE_CTA_CONFIG: Record<AppProfile, ProfileCtaConfig> = {
  benevole: {
    primaryCTA: {
      href: "/actions/new",
      label: { fr: "Déclarer une action", en: "Declare an action" },
      description: {
        fr: "Saisie terrain rapide en moins d'une minute",
        en: "Fast field capture in under one minute",
      },
    },
    secondaryCTA: {
      href: "/sections/community",
      label: { fr: "Rejoindre un cleanup", en: "Join a cleanup" },
      description: {
        fr: "Trouver un événement et aider le terrain",
        en: "Find an event and help on the ground",
      },
    },
    additionalActions: [
      {
        href: "/actions/map",
        label: { fr: "Vérifier la carte", en: "Check the map" },
        description: {
          fr: "Confirmer les zones à prioriser autour de vous",
          en: "Confirm the nearby priority zones",
        },
      },
      {
        href: "/learn/comprendre",
        label: { fr: "Vulgarisation", en: "Explanation" },
        description: {
          fr: "Contexte, ordres de grandeur et méthodologie",
          en: "Context, orders of magnitude and methodology",
        },
      },
    ],
  },
  coordinateur: {
    primaryCTA: {
      href: "/sections/community",
      label: {
        fr: "Organiser un cleanup",
        en: "Organize a cleanup",
      },
      description: {
        fr: "Créer et structurer l'événement collectif",
        en: "Create and structure the collective event",
      },
    },
    secondaryCTA: {
      href: DASHBOARD_ROUTE,
      label: { fr: "Gérer les RSVPs", en: "Manage RSVPs" },
      description: {
        fr: "Suivre l'engagement et les confirmations",
        en: "Track engagement and confirmations",
      },
    },
    additionalActions: [
      {
        href: "/sections/messagerie",
        label: { fr: "Relayer un besoin", en: "Relay a need" },
        description: {
          fr: "Diffuser un appel auprès du réseau",
          en: "Broadcast a request to the network",
        },
      },
      {
        href: REPORTS_ROUTE,
        label: { fr: "Faire le bilan", en: "Review the outcome" },
        description: {
          fr: "Préparer la restitution après action",
          en: "Prepare the post-action debrief",
        },
      },
    ],
  },
  scientifique: {
    primaryCTA: {
      href: REPORTS_ROUTE,
      label: { fr: "Analyser l'impact", en: "Analyze impact" },
      description: {
        fr: "Consolider les tendances et KPI utiles à la décision",
        en: "Consolidate trends and decision-grade KPIs",
      },
    },
    secondaryCTA: {
      href: "/sections/open-data",
      label: { fr: "Explorer les données", en: "Explore data" },
      description: {
        fr: "Accéder aux jeux de données et aux exports",
        en: "Access datasets and exports",
      },
    },
    additionalActions: [
      {
        href: "/methodologie",
        label: { fr: "Lire la méthodologie", en: "Read methodology" },
        description: {
          fr: "Vérifier les calculs, proxies et hypothèses",
          en: "Review calculations, proxies and assumptions",
        },
      },
      {
        href: "/prints/report",
        label: { fr: "Exporter le rapport", en: "Export report" },
        description: {
          fr: "Ouvrir la version imprimable consolidée",
          en: "Open the consolidated printable view",
        },
      },
    ],
  },
  entreprise: {
    primaryCTA: {
      href: SPONSOR_PORTAL_ROUTE,
      label: {
        fr: "Accéder au portail partenaires",
        en: "Open the partner portal",
      },
      description: {
        fr: "Suivre les engagements, partenariats et impacts",
        en: "Track commitments, partnerships and impact",
      },
    },
    secondaryCTA: {
      href: "/sections/community?tab=partners",
      label: { fr: "Voir les partenaires", en: "View partners" },
      description: {
        fr: "Identifier les acteurs et partenaires actifs",
        en: "Identify active organizations and partners",
      },
    },
    additionalActions: [
      {
        href: "/sections/funding",
        label: { fr: "Soutenir le projet", en: "Support the project" },
        description: {
          fr: "Découvrir les possibilités de mécénat",
          en: "Explore sponsorship opportunities",
        },
      },
      {
        href: REPORTS_ROUTE,
        label: { fr: "Consulter l'impact", en: "Review impact" },
        description: {
          fr: "Lire les indicateurs consolidés",
          en: "Review consolidated indicators",
        },
      },
    ],
  },
  elu: {
    primaryCTA: {
      href: SPONSOR_PORTAL_ROUTE,
      label: {
        fr: "Voir la synthèse territoriale",
        en: "View territorial summary",
      },
      description: {
        fr: "Lire la lecture budgétaire et territoriale",
        en: "Read the budget and territorial overview",
      },
    },
    secondaryCTA: {
      href: REPORTS_ROUTE,
      label: { fr: "Lire l'impact", en: "Read impact" },
      description: {
        fr: "Consulter les indicateurs consolidés",
        en: "Review consolidated indicators",
      },
    },
    additionalActions: [
      {
        href: "/actions/map",
        label: { fr: "Prioriser les zones", en: "Prioritize zones" },
        description: {
          fr: "Repérer les zones à traiter en premier",
          en: "Spot the zones to address first",
        },
      },
      {
        href: "/prints/report",
        label: { fr: "Télécharger le dossier", en: "Download the dossier" },
        description: {
          fr: "Partager un document clair et imprimable",
          en: "Share a clear printable document",
        },
      },
    ],
  },
  admin: {
    primaryCTA: {
      href: ADMIN_ROUTE,
      label: {
        fr: "Inbox créateur",
        en: "Creator inbox",
      },
      description: {
        fr: "Traiter les demandes et remontées prioritaires",
        en: "Handle priority requests and reports",
      },
    },
    secondaryCTA: {
      href: REPORTS_ROUTE,
      label: { fr: "Exporter les données", en: "Export data" },
      description: {
        fr: "Suivre les exports et les journaux",
        en: "Track exports and logs",
      },
    },
    additionalActions: [
      {
        href: ADMIN_GODMODE_ROUTE,
        label: { fr: "Contrôle système", en: "System control" },
        description: {
          fr: "Ouvrir l'arbitrage et les outils sensibles",
          en: "Open arbitration and sensitive tools",
        },
      },
      {
        href: DASHBOARD_ROUTE,
        label: { fr: "Santé du site", en: "Site health" },
        description: {
          fr: "Contrôler les flux et l'état général",
          en: "Check flows and overall status",
        },
      },
    ],
  },
  max: {
    primaryCTA: {
      href: ADMIN_GODMODE_ROUTE,
      label: {
        fr: "Arbitrer les cas sensibles",
        en: "Arbitrate sensitive cases",
      },
      description: {
        fr: "Accès propriétaire aux décisions finales",
        en: "Owner access to final decisions",
      },
    },
    secondaryCTA: {
      href: ADMIN_ROUTE,
      label: { fr: "Inbox créateur", en: "Creator inbox" },
      description: {
        fr: "Prioriser les demandes entrantes",
        en: "Prioritize incoming requests",
      },
    },
    additionalActions: [
      {
        href: DASHBOARD_ROUTE,
        label: { fr: "Vue d'ensemble", en: "Overview" },
        description: {
          fr: "Suivre l'activité et la santé du site",
          en: "Monitor activity and site health",
        },
      },
      {
        href: "/prints/report",
        label: { fr: "Audit et exports", en: "Audit and exports" },
        description: {
          fr: "Ouvrir la synthèse imprimable et les rapports",
          en: "Open the printable summary and reports",
        },
      },
    ],
  },
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
