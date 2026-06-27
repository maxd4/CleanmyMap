import type { Locale } from "@/lib/ui/preferences";
import { ADMIN_GODMODE_ROUTE, ADMIN_ROUTE, DASHBOARD_ROUTE, REPORTS_ROUTE, SPONSOR_PORTAL_ROUTE } from "@/lib/accueil-pilotage-routes";
import type { AppProfile } from "./profiles";

type Localized = Record<Locale, string>;

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

export const PROFILE_CTA_CONFIG: Record<AppProfile, ProfileCtaConfig> = {
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
