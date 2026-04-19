import type { Locale } from "@/lib/ui/preferences";
import type { RubriqueSpaceId } from "@/lib/sections-registry";
import type { Parcours, Role, SessionRole } from "@/lib/domain-language";

// Alias legacy conserves pour compatibilite; vocabulaire canonique: Role/Parcours/SessionRole.
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

export const PROFILE_DEFINITIONS: Record<AppProfile, ProfileDefinition> = {
  benevole: {
    id: "benevole",
    label: { fr: "Bénévole", en: "Volunteer" },
    subtitle: {
      fr: "Declaration terrain et suivi local",
      en: "Field declaration and local follow-up",
    },
    spacePriority: { execute: 1, supervise: 2, decide: 3, prepare: 4 },
  },
  coordinateur: {
    id: "coordinateur",
    label: { fr: "Coordinateur", en: "Coordinator" },
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
      fr: "Analyse des donnees et evidence statistique",
      en: "Data analysis and statistical evidence",
    },
    spacePriority: { decide: 1, supervise: 2, prepare: 3, execute: 4 },
  },
  elu: {
    id: "elu",
    label: { fr: "Décideur", en: "Decision maker" },
    subtitle: {
      fr: "Pilotage institutionnel et décisionnel",
      en: "Institutional and decision oversight",
    },
    spacePriority: { decide: 1, supervise: 2, prepare: 3, execute: 4 },
  },
  admin: {
    id: "admin",
    label: { fr: "Admin", en: "Admin" },
    subtitle: {
      fr: "Moderation et supervision",
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
      label: { fr: "Déclarer une action", en: "Declare action" },
      description: {
        fr: "Saisie terrain rapide en moins d'une minute",
        en: "Fast field capture in under one minute",
      },
    },
    secondaryCTA: {
      href: "/actions/map",
      label: { fr: "Verifier la carte", en: "Check map" },
      description: {
        fr: "Confirmer la priorite terrain autour de vous",
        en: "Confirm nearby field priorities",
      },
    },
    additionalActions: [
      {
        href: "/actions/history",
        label: { fr: "Consulter l'historique", en: "Open history" },
        description: {
          fr: "Suivre les actions validees",
          en: "Track validated actions",
        },
      },
    ],
  },
  coordinateur: {
    primaryCTA: {
      href: "/sections/community",
      label: {
        fr: "Lancer / mettre à jour une opération communautaire",
        en: "Launch or update a community operation",
      },
      description: {
        fr: "Piloter agenda, RSVPs et conversion en actions",
        en: "Drive agenda, RSVPs and action conversion",
      },
    },
    secondaryCTA: {
      href: "/dashboard",
      label: { fr: "Suivre le cockpit", en: "Open cockpit" },
      description: {
        fr: "Voir les alertes et priorites du jour",
        en: "See daily alerts and priorities",
      },
    },
    additionalActions: [
      {
        href: "/reports",
        label: { fr: "Consulter les rapports", en: "Open reports" },
        description: {
          fr: "Synthese exportable multi-horizon",
          en: "Exportable multi-horizon synthesis",
        },
      },
    ],
  },
  scientifique: {
    primaryCTA: {
      href: "/reports",
      label: { fr: "Analyser les indicateurs", en: "Analyze indicators" },
      description: {
        fr: "Consolider les tendances et KPI utiles a la decision",
        en: "Consolidate trends and decision-grade KPIs",
      },
    },
    secondaryCTA: {
      href: "/sections/climate",
      label: { fr: "Lire le contexte durable", en: "Open sustainability context" },
      description: {
        fr: "Croiser impact local, ODD et limites planetaires",
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
          fr: "Ajouter les signaux meteo-climat a l'analyse",
          en: "Add weather-climate signals to analysis",
        },
      },
    ],
  },
  elu: {
    primaryCTA: {
      href: "/sections/elus",
      label: {
        fr: "Priorisation territoriale",
        en: "Territorial prioritization",
      },
      description: {
        fr: "Voir les zones a traiter en priorite",
        en: "View top zones to address",
      },
    },
    secondaryCTA: {
      href: "/reports",
      label: {
        fr: "Consulter les rapports",
        en: "Open reports",
      },
      description: {
        fr: "Lecture synthetique des indicateurs",
        en: "Read synthesized indicators",
      },
    },
    additionalActions: [
      {
        href: "/sections/climate",
        label: { fr: "Comparer dans Developpement durable", en: "Compare in sustainability" },
        description: {
          fr: "Lecture territoriale comparee integree",
          en: "Integrated cross-area reading",
        },
      },
    ],
  },
  admin: {
    primaryCTA: {
      href: "/admin",
      label: {
        fr: "Traiter le backlog critique",
        en: "Process critical backlog",
      },
      description: {
        fr: "Prioriser moderation/imports sensibles",
        en: "Prioritize moderation and sensitive imports",
      },
    },
    secondaryCTA: {
      href: "/reports",
      label: { fr: "Exporter les donnees", en: "Export data" },
      description: {
        fr: "CSV/JSON et suivi des operations",
        en: "CSV/JSON and operations tracking",
      },
    },
    additionalActions: [
      {
        href: "/dashboard",
        label: { fr: "Verifier l'etat systeme", en: "Check system health" },
        description: {
          fr: "Integrations et uptime",
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
