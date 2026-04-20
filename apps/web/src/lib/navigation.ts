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
  home:      { id: "home",      label: { fr: "Page d'accueil", en: "Home" },         icon: "🏠", color: "text-slate-600" },
  act:       { id: "act",       label: { fr: "Agir",           en: "Act" },           icon: "⚡", color: "text-amber-600" },
  visualize: { id: "visualize", label: { fr: "Visualiser",     en: "Visualize" },     icon: "🗺️", color: "text-sky-600"  },
  impact:    { id: "impact",    label: { fr: "Impact",         en: "Impact" },        icon: "📊", color: "text-emerald-600" },
  network:   { id: "network",   label: { fr: "Réseau",         en: "Network" },       icon: "🤝", color: "text-violet-600" },
  learn:     { id: "learn",     label: { fr: "Apprendre",      en: "Learn" },         icon: "📚", color: "text-rose-600"  },
  pilot:     { id: "pilot",     label: { fr: "Piloter",        en: "Govern" },        icon: "🎯", color: "text-indigo-600" },
};
const FIXED_SPACE_ORDER: NavigationBlockId[] = [
  "home",
  "act",
  "visualize",
  "impact",
  "network",
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
  "guide",
  "kit",
  "community",
  "annuaire",
  "open-data",
  "funding",
  "reports",
  "climate",
  "weather",
  "elus",
  "admin",
]);

const SIMPLIFIE_ALLOWED_ROUTE_IDS = new Set<RouteId>([
  "profile",
  "new",
  "map",
  "history",
  "guide",
  "dashboard",
  "community",
  "annuaire",
  "admin",
]);

// Source de verite navigation: profil -> espaces -> pages.
const PARCOURS_SPACE_PAGE_MAP: ProfileSpacePageMap = {
  benevole: {
    home: ["dashboard", "profile", "new"],
    act: ["route", "trash-spotter"],
    visualize: ["map"],
    impact: ["reports", "gamification"],
    network: ["network", "community", "annuaire", "open-data", "funding", "actors"],
    learn: ["hub", "climate", "guide", "recycling", "kit"],
    pilot: [],
  },
  coordinateur: {
    home: ["dashboard", "profile", "new"],
    act: ["route", "trash-spotter"],
    visualize: ["map", "weather"],
    impact: ["reports", "gamification"],
    network: ["community", "annuaire", "open-data", "funding", "actors"],
    learn: ["hub", "climate", "guide", "recycling", "kit"],
    pilot: ["elus"],
  },
  scientifique: {
    home: ["dashboard", "profile", "new"],
    act: ["route", "trash-spotter"],
    visualize: ["map", "weather"],
    impact: ["reports", "gamification"],
    network: ["community", "annuaire", "open-data", "funding", "actors"],
    learn: ["hub", "climate", "guide", "recycling", "kit"],
    pilot: ["elus"],
  },
  elu: {
    home: ["dashboard", "profile", "new"],
    act: ["route", "trash-spotter"],
    visualize: ["map", "weather"],
    impact: ["reports", "gamification"],
    network: ["network", "community", "annuaire", "open-data", "funding", "actors"],
    learn: ["hub", "climate", "guide", "recycling", "kit"],
    pilot: ["sponsor", "elus"],
  },
  admin: {
    home: ["dashboard", "profile", "new"],
    act: ["route", "trash-spotter"],
    visualize: ["map", "weather"],
    impact: ["reports", "gamification"],
    network: ["network", "community", "annuaire", "open-data", "funding", "actors"],
    learn: ["hub", "climate", "guide", "recycling", "kit"],
    pilot: ["godmode", "admin", "sponsor", "elus"],
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
  return SIMPLIFIE_ALLOWED_ROUTE_IDS.has(routeId);
}

function getDisplayModeLabel(displayMode: DisplayMode, locale: Locale): string {
  if (displayMode === "sobre") {
    return locale === "fr" ? "mode sobre" : "calm mode";
  }
  if (displayMode === "simplifie") {
    return locale === "fr" ? "mode simplifie" : "simplified mode";
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

  if (displayMode === "exhaustif") {
    return spaces;
  }
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
  if (!params.isAdmin) {
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

  return PROFILE_ORDER.filter(
    (profile) => params.isAdmin || profile !== "admin",
  ).map((profile) => ({
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
      locale === "fr" ? "Navigation en 7 blocs" : "7-block navigation",
    summary:
      locale === "fr"
        ? `${rubriqueCount} pages operationnelles pour ${profileLabel} (${spaceCount} blocs, ${displayModeLabel})`
        : `${rubriqueCount} operational pages for ${profileLabel} (${spaceCount} blocks, ${displayModeLabel})`,
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
