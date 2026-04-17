import type { DisplayMode, Locale } from "./ui/preferences";
import type { Espace } from "./domain-language";
import {
  RUBRIQUE_CATEGORIES,
  RUBRIQUE_REGISTRY,
  getVisibleRubriquesByCategory,
  type LocalizedText,
  type Rubrique,
  type RubriqueSpaceId,
} from "./sections-registry";
import {
  PROFILE_ORDER,
  getProfileEntryPath,
  getProfileLabel,
  getProfilePrimaryAction,
  getProfileSpacePriority,
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
  routeId: Rubrique["id"];
};

export type NavigationSpace = {
  id: Espace;
  label: LocalizedText;
  items: NavigationItem[];
};

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

const SPACE_DEFINITIONS: Record<
  RubriqueSpaceId,
  { id: RubriqueSpaceId; label: LocalizedText }
> = {
  execute: { id: "execute", label: { fr: "Executer", en: "Execute" } },
  supervise: { id: "supervise", label: { fr: "Superviser", en: "Supervise" } },
  decide: { id: "decide", label: { fr: "Decider", en: "Decide" } },
  prepare: { id: "prepare", label: { fr: "Preparer", en: "Prepare" } },
};
const FIXED_SPACE_ORDER: RubriqueSpaceId[] = [
  "execute",
  "supervise",
  "decide",
  "prepare",
];

type RouteId = Rubrique["id"];
type ProfileSpacePageMap = Record<
  AppProfile,
  Record<RubriqueSpaceId, RouteId[]>
>;

const SOBRE_ALLOWED_ROUTE_IDS = new Set<RouteId>([
  "new",
  "map",
  "history",
  "dashboard",
  "guide",
  "kit",
  "community",
  "reports",
  "compare",
  "weather",
  "elus",
  "admin",
  "sandbox",
]);

const SIMPLIFIE_ALLOWED_ROUTE_IDS = new Set<RouteId>([
  "new",
  "map",
  "history",
  "guide",
  "dashboard",
  "community",
  "admin",
]);

// Source de verite navigation: profil -> espaces -> pages.
const PARCOURS_SPACE_PAGE_MAP: ProfileSpacePageMap = {
  benevole: {
    execute: ["new", "map"],
    supervise: ["history", "trash-spotter"],
    decide: ["dashboard", "gamification"],
    prepare: ["guide", "kit", "community"],
  },
  coordinateur: {
    execute: ["community", "new", "map", "route"],
    supervise: ["history", "dashboard", "weather"],
    decide: ["reports", "compare", "climate", "elus"],
    prepare: ["guide", "kit", "actors", "recycling"],
  },
  scientifique: {
    execute: ["map", "history"],
    supervise: ["dashboard", "weather", "trash-spotter"],
    decide: ["reports", "compare", "climate", "elus"],
    prepare: ["guide", "kit", "actors"],
  },
  elu: {
    execute: ["elus"],
    supervise: ["dashboard", "history"],
    decide: ["reports", "compare", "climate", "weather"],
    prepare: ["guide"],
  },
  admin: {
    execute: ["admin", "new", "community"],
    supervise: ["dashboard", "history", "map", "sandbox"],
    decide: ["reports", "compare", "climate", "elus"],
    prepare: ["guide", "kit", "weather", "actors"],
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
      (a, b) => a.priority - b.priority || a.label.fr.localeCompare(b.label.fr),
    );
}

export function getNavigationCategoriesForProfile(
  profile: AppProfile,
  displayMode: DisplayMode = "exhaustif",
): NavigationCategory[] {
  const allowedRoutes = new Set(
    getMappedRubriquesForProfile(profile, displayMode).map(
      (item) => item.route,
    ),
  );
  return RUBRIQUE_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    items: getVisibleRubriquesByCategory(category.id)
      .filter((rubrique) => allowedRoutes.has(rubrique.route))
      .map((rubrique) => toNavItem(rubrique)),
  })).filter((category) => category.items.length > 0);
}

export function getNavigationSpacesForProfile(
  profile: AppProfile,
  displayMode: DisplayMode = "exhaustif",
): NavigationSpace[] {
  const byId = new Map<RouteId, Rubrique>(
    getMappedRubriquesForProfile(profile, displayMode).map((item) => [
      item.id,
      item,
    ]),
  );

  // Ordonner les espaces selon la priorité définie pour le profil
  const prioritizedSpaceOrder = [...FIXED_SPACE_ORDER].sort((a, b) => {
    const priorityA = getProfileSpacePriority(profile, a);
    const priorityB = getProfileSpacePriority(profile, b);
    return priorityA - priorityB;
  });

  const spaces = prioritizedSpaceOrder.map((spaceId) => {
    const items = PARCOURS_SPACE_PAGE_MAP[profile][spaceId]
      .filter((id) => isRouteAllowedByDisplayMode(id, displayMode))
      .map((id) => byId.get(id))
      .filter((rubrique): rubrique is Rubrique => Boolean(rubrique))
      .map((rubrique) => toNavItem(rubrique));
    return { id: spaceId, label: SPACE_DEFINITIONS[spaceId].label, items };
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
): RubriqueSpaceId | null {
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
      locale === "fr" ? "Navigation par profil" : "Profile-based navigation",
    summary:
      locale === "fr"
        ? `${rubriqueCount} pages operationnelles pour ${profileLabel} (${spaceCount} espaces, ${displayModeLabel})`
        : `${rubriqueCount} operational pages for ${profileLabel} (${spaceCount} spaces, ${displayModeLabel})`,
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
