import type { Locale } from "@/lib/ui/preferences";
import type { RubriqueSpaceId } from "@/lib/sections-registry";
import type { Parcours, Role, SessionRole } from "@/lib/domain-language";

// Alias legacy conservés pour compatibilité; vocabulaire canonique: Role/Parcours/SessionRole.
export type AppProfile = Parcours;
export type AppRoleLabel = SessionRole;

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

export const PROFILE_ORDER: AppProfile[] = [
  "benevole",
  "coordinateur",
  "scientifique",
  "elu",
  "admin",
];

export const SELF_SERVICE_PROFILE_ORDER = [
  "benevole",
  "coordinateur",
  "scientifique",
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
  elu: {
    id: "elu",
    label: { fr: "Autorité locale", en: "Local authority" },
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
};

const ROLE_ALIASES: Record<string, Role> = {
  admin: "admin",
  administrator: "admin",
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
      label: { fr: "Déclarer", en: "Declare" },
      description: {
        fr: "Saisie terrain rapide en moins d'une minute",
        en: "Fast field capture in under one minute",
      },
    },
    secondaryCTA: {
      href: "/actions/map",
      label: { fr: "Voir la carte", en: "View map" },
      description: {
        fr: "Confirmer la priorité terrain autour de vous",
        en: "Confirm nearby field priorities",
      },
    },
    additionalActions: [
      {
        href: "/actions/history",
        label: { fr: "Historique", en: "History" },
        description: {
          fr: "Suivre les actions validées",
          en: "Track validated actions",
        },
      },
      {
        href: "/learn/hub",
        label: { fr: "Apprendre & Progresser", en: "Learn & Progress" },
        description: {
          fr: "Hub éducatif et kit du bénévole",
          en: "Educational hub and volunteer kit",
        },
      },
    ],
  },
  coordinateur: {
    primaryCTA: {
      href: "/sections/community",
      label: {
        fr: "Gérer l'opération",
        en: "Manage operation",
      },
      description: {
        fr: "Piloter agenda, RSVPs et conversion en actions",
        en: "Drive agenda, RSVPs and action conversion",
      },
    },
    secondaryCTA: {
      href: "/dashboard",
      label: { fr: "Cockpit", en: "Cockpit" },
      description: {
        fr: "Voir les alertes et priorités du jour",
        en: "See daily alerts and priorities",
      },
    },
    additionalActions: [
      {
        href: "/reports",
        label: { fr: "Rapports", en: "Reports" },
        description: {
          fr: "Synthèse exportable multi-horizon",
          en: "Exportable multi-horizon synthesis",
        },
      },
    ],
  },
  scientifique: {
    primaryCTA: {
      href: "/reports",
      label: { fr: "Analyser", en: "Analyze" },
      description: {
        fr: "Consolider les tendances et KPI utiles à la décision",
        en: "Consolidate trends and decision-grade KPIs",
      },
    },
    secondaryCTA: {
      href: "/sections/climate",
      label: { fr: "Contexte", en: "Context" },
      description: {
        fr: "Croiser impact local, ODD et limites planétaires",
        en: "Cross local impact with SDGs and boundaries",
      },
    },
    additionalActions: [
      {
        href: "/sections/climate",
        label: {
          fr: "Croiser avec le contexte climat",
          en: "Cross-check climate context",
        },
        description: {
          fr: "Ajouter les signaux météo-climat à l'analyse",
          en: "Add weather-climate signals to analysis",
        },
      },
    ],
  },
  elu: {
    primaryCTA: {
      href: "/sponsor-portal",
      label: {
        fr: "Portail",
        en: "Portal",
      },
      description: {
        fr: "Pilotage budgétaire et impact territorial",
        en: "Budget oversight and territorial impact",
      },
    },
    secondaryCTA: {
      href: "/reports",
      label: {
        fr: "Rapports",
        en: "Reports",
      },
      description: {
        fr: "Lecture synthétique des indicateurs",
        en: "Read synthesized indicators",
      },
    },
    additionalActions: [
      {
        href: "/actions/map",
        label: { fr: "Priorisation terrain", en: "Territorial prioritization" },
        description: {
          fr: "Voir les zones à traiter en priorité",
          en: "View top zones to address",
        },
      },
      {
        href: "/sections/climate",
        label: { fr: "Développement durable", en: "Sustainability" },
        description: {
          fr: "Lecture territoriale comparée intégrée",
          en: "Integrated cross-area reading",
        },
      },
    ],
  },
  admin: {
    primaryCTA: {
      href: "/admin",
      label: {
        fr: "Backlog",
        en: "Backlog",
      },
      description: {
        fr: "Prioriser modération/imports sensibles",
        en: "Prioritize moderation and sensitive imports",
      },
    },
    secondaryCTA: {
      href: "/reports",
      label: { fr: "Exporter", en: "Export" },
      description: {
        fr: "CSV/JSON et suivi des opérations",
        en: "CSV/JSON and operations tracking",
      },
    },
    additionalActions: [
      {
        href: "/admin/godmode",
        label: { fr: "God Mode", en: "God Mode" },
        description: {
          fr: "Accès root et sandbox admin",
          en: "Root access and admin sandbox",
        },
      },
      {
        href: "/dashboard",
        label: { fr: "Vérifier l'état système", en: "Check system health" },
        description: {
          fr: "Intégrations et uptime",
          en: "Integrations and uptime",
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
  isAdmin: boolean;
}): Role {
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

export function getProfileEntryPath(profile: AppProfile): string {
  return `/profil/${profile}`;
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
