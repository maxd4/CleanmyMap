import type { DisplayMode, Locale } from "./ui/preferences";
import {
  RUBRIQUE_CATEGORIES,
  RUBRIQUE_REGISTRY,
  getVisibleRubriquesByCategory,
  type LocalizedText,
  type Rubrique,
} from "./sections-registry";
import {
  PROFILE_ORDER,
  getProfileEntryPath,
  getProfileLabel,
  getProfilePrimaryAction,
  getProfileSecondaryAction,
  getProfileSubtitle,
  type AppProfile,
  type ProfileAction,
} from "./profiles";

export type NavigationItem = {
  id: string;
  href: string;
  label: LocalizedText;
  description: LocalizedText;
  routeId: string;
};

export type NavigationBlockId =
  | "home"
  | "act"
  | "visualize"
  | "impact"
  | "network"
  | "connect"
  | "learn"
  | "pilot";

export type NavigationSpaceMeta = {
  id: NavigationBlockId;
  label: LocalizedText;
  icon: string;
  color: string; // Tailwind text-* class
};

export type NavigationSpace = {
  id: NavigationBlockId;
  label: LocalizedText;
  icon: string;
  color: string;
  items: NavigationItem[];
};

const SPACE_DEFINITIONS: Record<NavigationBlockId, NavigationSpaceMeta> = {
  home: {
    id: "home",
    label: { fr: "Accueil & Pilotage", en: "Home & Operations" },
    icon: "🏠",
    color: "text-orange-600",
  },
  act: { id: "act", label: { fr: "Agir", en: "Act" }, icon: "⚡", color: "text-emerald-600" },
  visualize: {
    id: "visualize",
    label: { fr: "Cartographie & Impact", en: "Mapping & Impact" },
    icon: "🗺️",
    color: "text-sky-600",
  },
  impact: { id: "impact", label: { fr: "Impacter", en: "Impact" }, icon: "📊", color: "text-red-600" },
  network: {
    id: "network",
    label: { fr: "Réseau & Discussions", en: "Network & Discussions" },
    icon: "🤝",
    color: "text-indigo-600",
  },
  connect: { id: "connect", label: { fr: "Discussion", en: "Discussions" }, icon: "💬", color: "text-pink-600" },
  learn: { id: "learn", label: { fr: "Apprendre", en: "Learn" }, icon: "📚", color: "text-yellow-600" },
  pilot: {
    id: "pilot",
    label: { fr: "Pilotage", en: "Governance" },
    icon: "🎯",
    color: "text-amber-800",
  },
};
const FIXED_SPACE_ORDER: NavigationBlockId[] = [
  "home",
  "act",
  "visualize",
  "impact",
  "network",
  "connect",
  "learn",
  "pilot",
];

export type NavigationCategory = {
  id: string;
  label: LocalizedText;
  items: NavigationItem[];
};

export type ProfileNavigationEntry = {
  id: AppProfile;
  href: string;
  label: LocalizedText;
  description: LocalizedText;
};

export type NavigationProfileOverview = {
  primaryCTA: ProfileAction;
  secondaryCTA: ProfileAction | null;
};

type RouteId = Rubrique["id"];
type ProfileSpacePageMap = Record<
  AppProfile,
  Record<NavigationBlockId, RouteId[]>
>;

const SOBRE_ALLOWED_ROUTE_IDS = new Set<RouteId>([
  "profile",
  "new",
  "map",
  "history",
  "dashboard",
  "feedback",
  "guide",
  "sandbox",
  "methodologie",
  "community",
  "messagerie",
  "annuaire",
  "open-data",
  "funding",
  "reports",
  "climate",
  "weather",
  "elus",
  "admin",
  "pilotage",
  "learn-comprendre",
  "learn-sentrainer",
  "learn-bonnes-pratiques",
  "learn-ressources",
]);

const MINIMALISTE_ALLOWED_ROUTE_IDS = new Set<RouteId>([
  "profile",
  "new",
  "map",
  "history",
  "dashboard",
  "feedback",
  "sandbox",
  "methodologie",
  "community",
  "messagerie",
  "annuaire",
  "admin",
  "pilotage",
  "learn-comprendre",
  "learn-sentrainer",
  "learn-bonnes-pratiques",
  "learn-ressources",
]);

// Source de vérité navigation: profil -> espaces -> pages.
const PARCOURS_SPACE_PAGE_MAP: ProfileSpacePageMap = {
  benevole: {
    home: ["dashboard", "explorer"],
    act: ["new", "route", "weather", "guide", "trash-spotter"],
    visualize: ["map", "sandbox", "methodologie", "reports", "gamification"],
    impact: [],
    network: ["network", "community", "feedback", "messagerie", "open-data"],
    connect: [],
    learn: [
      "hub",
      "learn-comprendre",
      "learn-sentrainer",
      "learn-bonnes-pratiques",
      "learn-ressources",
    ],
    pilot: [],
  },
  coordinateur: {
    home: ["dashboard", "explorer", "pilotage", "elus"],
    act: ["new", "route", "weather", "guide", "trash-spotter"],
    visualize: ["map", "sandbox", "methodologie", "reports", "gamification"],
    impact: [],
    network: ["network", "community", "feedback", "messagerie", "open-data"],
    connect: [],
    learn: [
      "hub",
      "learn-comprendre",
      "learn-sentrainer",
      "learn-bonnes-pratiques",
      "learn-ressources",
    ],
    pilot: [],
  },
  scientifique: {
    home: ["dashboard", "explorer", "elus"],
    act: ["new", "route", "weather", "guide", "trash-spotter"],
    visualize: ["map", "sandbox", "methodologie", "reports", "gamification"],
    impact: [],
    network: ["network", "community", "feedback", "messagerie", "open-data"],
    connect: [],
    learn: [
      "hub",
      "learn-comprendre",
      "learn-sentrainer",
      "learn-bonnes-pratiques",
      "learn-ressources",
    ],
    pilot: [],
  },
  entreprise: {
    home: ["dashboard", "explorer", "sponsor", "funding"],
    act: ["new", "route", "weather", "guide", "trash-spotter"],
    visualize: ["map", "sandbox", "methodologie", "reports", "gamification"],
    impact: [],
    network: ["network", "community", "feedback", "messagerie", "open-data"],
    connect: [],
    learn: [
      "hub",
      "learn-comprendre",
      "learn-sentrainer",
      "learn-bonnes-pratiques",
      "learn-ressources",
    ],
    pilot: [],
  },
  elu: {
    home: ["dashboard", "explorer", "sponsor", "elus"],
    act: ["new", "route", "weather", "guide", "trash-spotter"],
    visualize: ["map", "sandbox", "methodologie", "reports", "gamification"],
    impact: [],
    network: ["network", "community", "feedback", "messagerie", "open-data"],
    connect: [],
    learn: [
      "hub",
      "learn-comprendre",
      "learn-sentrainer",
      "learn-bonnes-pratiques",
      "learn-ressources",
    ],
    pilot: [],
  },
  admin: {
    home: ["dashboard", "explorer", "pilotage", "admin", "elus"],
    act: ["new", "route", "weather", "guide", "trash-spotter"],
    visualize: ["map", "sandbox", "methodologie", "reports", "gamification"],
    impact: [],
    network: ["network", "community", "feedback", "messagerie", "open-data"],
    connect: [],
    learn: [
      "hub",
      "learn-comprendre",
      "learn-sentrainer",
      "learn-bonnes-pratiques",
      "learn-ressources",
    ],
    pilot: [],
  },
  max: {
    home: ["dashboard", "explorer", "pilotage", "admin", "sponsor", "elus", "godmode"],
    act: ["new", "route", "weather", "guide", "trash-spotter"],
    visualize: ["map", "sandbox", "methodologie", "reports", "gamification"],
    impact: [],
    network: ["network", "community", "feedback", "messagerie", "open-data"],
    connect: [],
    learn: [
      "hub",
      "learn-comprendre",
      "learn-sentrainer",
      "learn-bonnes-pratiques",
      "learn-ressources",
    ],
    pilot: [],
  },
};

const RUBRIQUE_BY_ID = new Map<RouteId, Rubrique>(
  RUBRIQUE_REGISTRY.map((rubrique) => [rubrique.id, rubrique]),
);

function toNavItem(rubrique: Rubrique): NavigationItem {
  return {
    id: rubrique.id,
    href: rubrique.route,
    label: rubrique.label,
    description: rubrique.description,
    routeId: rubrique.id,
  };
}

export function getPilotFallbackItems(locale: string = "fr"): NavigationItem[] {
  const fallbackRouteIds: RouteId[] = ["dashboard", "reports"];
  const isFrench = locale === "fr";
  return fallbackRouteIds
    .map((routeId) => RUBRIQUE_BY_ID.get(routeId))
    .filter((rubrique): rubrique is Rubrique => Boolean(rubrique))
    .map((rubrique) => toNavItem(rubrique))
    .map((item) => ({
      ...item,
      description: {
        fr: item.routeId === "dashboard"
          ? "Vue synthèse de Mon espace"
          : "Synthèse d'impact, exports et contrôle",
        en: item.routeId === "dashboard"
          ? "Operational overview"
          : "Impact synthesis, exports and control",
      },
      label: {
        fr: isFrench
          ? item.routeId === "dashboard"
            ? "Mon espace"
            : "Rapports d'impact"
          : item.routeId === "dashboard"
            ? "Dashboard"
            : "Impact reports",
        en: item.routeId === "dashboard"
          ? "Dashboard"
          : "Impact reports",
      },
    }));
}

function isRouteAllowedByDisplayMode(
  routeId: RouteId,
  displayMode: DisplayMode,
): boolean {
  if (displayMode === "exhaustif") {
    return true;
  }
  if (displayMode === "sobre") {
    return SOBRE_ALLOWED_ROUTE_IDS.has(routeId);
  }
  return MINIMALISTE_ALLOWED_ROUTE_IDS.has(routeId);
}

function getDisplayModeLabel(displayMode: DisplayMode, locale: Locale): string {
  if (displayMode === "sobre") {
    return locale === "fr" ? "mode sobre" : "calm mode";
  }
  if (displayMode === "minimaliste") {
    return locale === "fr" ? "mode essentiel" : "minimalist mode";
  }
  return locale === "fr" ? "mode exhaustif" : "exhaustive mode";
}

function getMappedRubriquesForProfile(
  profile: AppProfile,
  displayMode: DisplayMode,
  locale: Locale = "fr",
): Rubrique[] {
  const routeIds = new Set<RouteId>(
    Object.values(PARCOURS_SPACE_PAGE_MAP[profile]).flatMap((ids) => ids),
  );
  return [...routeIds]
    .filter((id) => isRouteAllowedByDisplayMode(id, displayMode))
    .map((id) => RUBRIQUE_BY_ID.get(id))
    .filter((rubrique): rubrique is Rubrique => Boolean(rubrique))
    .filter((rubrique) => rubrique.availability === "available")
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        a.label[locale].localeCompare(b.label[locale]),
    );
}

export function getNavigationCategoriesForProfile(
  profile: AppProfile,
  displayMode: DisplayMode = "exhaustif",
  locale: Locale = "fr",
): NavigationCategory[] {
  const allowedRoutes = new Set(
    getMappedRubriquesForProfile(profile, displayMode, locale).map(
      (item) => item.route,
    ),
  );
  return RUBRIQUE_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    items: getVisibleRubriquesByCategory(category.id, locale)
      .filter((rubrique) => allowedRoutes.has(rubrique.route))
      .map((rubrique) => toNavItem(rubrique)),
  })).filter((category) => category.items.length > 0);
}

export function getNavigationSpacesForProfile(
  profile: AppProfile,
  displayMode: DisplayMode = "exhaustif",
  locale: Locale = "fr",
): NavigationSpace[] {
  const byId = new Map<RouteId, Rubrique>(
    getMappedRubriquesForProfile(profile, displayMode, locale).map((item) => [
      item.id,
      item,
    ]),
  );

  const spaces = FIXED_SPACE_ORDER.map((spaceId) => {
    const items = PARCOURS_SPACE_PAGE_MAP[profile][spaceId]
      .filter((id) => isRouteAllowedByDisplayMode(id, displayMode))
      .map((id) => byId.get(id))
      .filter((rubrique): rubrique is Rubrique => Boolean(rubrique))
      .map((rubrique) => toNavItem(rubrique));
    const def = SPACE_DEFINITIONS[spaceId];
    return { id: spaceId, label: def.label, icon: def.icon, color: def.color, items };
  });

  return spaces.filter((space) => space.items.length > 0);
}

export function getActiveSpaceForPath(
  profile: AppProfile,
  pathname: string,
  displayMode: DisplayMode = "exhaustif",
): NavigationBlockId | null {
  for (const space of getNavigationSpacesForProfile(profile, displayMode)) {
    if (
      space.items.some(
        (item) =>
          pathname === item.href || pathname.startsWith(`${item.href}/`),
      )
    ) {
      return space.id;
    }
  }
  return null;
}

export function getProfileNavigationEntries(params: {
  currentProfile: AppProfile;
  isAdmin: boolean;
}): ProfileNavigationEntry[] {
  if (!params.isAdmin && params.currentProfile !== "max") {
    const profile = params.currentProfile;
    return [
      {
        id: profile,
        href: getProfileEntryPath(profile),
        label: {
          fr: getProfileLabel(profile, "fr"),
          en: getProfileLabel(profile, "en"),
        },
        description: {
          fr: getProfileSubtitle(profile, "fr"),
          en: getProfileSubtitle(profile, "en"),
        },
      },
    ];
  }

  const visibleProfiles =
    params.currentProfile === "max"
      ? PROFILE_ORDER
      : PROFILE_ORDER.filter((profile) => profile !== "max");

  return visibleProfiles
    .filter(
      (profile) =>
        params.isAdmin || params.currentProfile === "max" || profile !== "admin",
    )
    .map((profile) => ({
    id: profile,
    href: getProfileEntryPath(profile),
    label: {
      fr: getProfileLabel(profile, "fr"),
      en: getProfileLabel(profile, "en"),
    },
    description: {
      fr: getProfileSubtitle(profile, "fr"),
      en: getProfileSubtitle(profile, "en"),
    },
  }));
}

export function getNavigationLabels(
  locale: Locale,
  profile: AppProfile,
  params: { isAdmin: boolean; displayMode: DisplayMode },
) {
  const displayMode = params.displayMode;
  const spaces = getNavigationSpacesForProfile(profile, displayMode);
  const rubriqueCount = spaces.reduce(
    (acc, space) => acc + space.items.length,
    0,
  );
  const spaceCount = spaces.length;
  const profileLabel = getProfileLabel(profile, locale);
  const displayModeLabel = getDisplayModeLabel(displayMode, locale);
  return {
    navTitle:
      locale === "fr"
        ? `Navigation en ${spaceCount} sections`
        : `${spaceCount}-section navigation`,
    summary:
      locale === "fr"
        ? `${rubriqueCount} pages opérationnelles pour ${profileLabel} (${spaceCount} sections, ${displayModeLabel})`
        : `${rubriqueCount} operational pages for ${profileLabel} (${spaceCount} sections, ${displayModeLabel})`,
  };
}

export function getNavigationProfileOverview(
  profile: AppProfile,
  displayMode: DisplayMode = "exhaustif",
): NavigationProfileOverview {
  return {
    primaryCTA: getProfilePrimaryAction(profile),
    secondaryCTA:
      displayMode === "exhaustif" ? getProfileSecondaryAction(profile) : null,
  };
}

/**
 * Vérifie si une section (par routeId) est autorisée pour un profil donné.
 * Source de vérité: PARCOURS_SPACE_PAGE_MAP.
 */
export function isSectionAllowedForProfile(
  sectionId: string,
  profile: AppProfile,
): boolean {
  const allowed = new Set<string>(
    Object.values(PARCOURS_SPACE_PAGE_MAP[profile]).flatMap((ids) => ids),
  );
  return allowed.has(sectionId);
}
