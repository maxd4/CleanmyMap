import type { Locale } from "@/lib/ui/preferences";
import type {
  Espace,
  PageRoute,
  RubriqueKind as DomainRubriqueKind,
} from "@/lib/domain-language";

export type LocalizedText = Record<Locale, string>;

export type RubriqueCategory = {
  id: "pilotage" | "terrain" | "analysis" | "resources" | "community";
  label: LocalizedText;
};

export type RubriqueAvailability = "available" | "hidden";
export type RubriqueKind = DomainRubriqueKind;
export type RubriqueImplementation = "finalized" | "pending";
export type RubriqueSpaceId = Espace;

export type RubriqueDefinition = {
  id: string;
  categoryId: RubriqueCategory["id"];
  spaceId: RubriqueSpaceId;
  priority: number;
  kind: RubriqueKind;
  route: PageRoute;
  label: LocalizedText;
  description: LocalizedText;
  availability: RubriqueAvailability;
  implementation: RubriqueImplementation;
  pendingNote?: LocalizedText;
};

export const RUBRIQUE_CATEGORIES = [
  { id: "pilotage", label: { fr: "Pilotage", en: "Operations" } },
  { id: "terrain", label: { fr: "Actions terrain", en: "Field actions" } },
  {
    id: "analysis",
    label: { fr: "Analyse & contexte", en: "Analysis & context" },
  },
  { id: "resources", label: { fr: "Guide & outils", en: "Guide & tools" } },
  { id: "community", label: { fr: "Communaute", en: "Community" } },
] as const satisfies readonly RubriqueCategory[];

export const RUBRIQUE_REGISTRY = [
  {
    id: "dashboard",
    categoryId: "pilotage",
    spaceId: "decide",
    priority: 20,
    kind: "app-route",
    route: "/dashboard",
    label: { fr: "Tableau de bord", en: "Dashboard" },
    description: { fr: "Vue synthese", en: "Overview" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "reports",
    categoryId: "pilotage",
    spaceId: "decide",
    priority: 30,
    kind: "app-route",
    route: "/reports",
    label: { fr: "Reporting", en: "Reporting" },
    description: { fr: "Exports et controle", en: "Exports and control" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "admin",
    categoryId: "pilotage",
    spaceId: "supervise",
    priority: 10,
    kind: "app-route",
    route: "/admin",
    label: { fr: "Administration", en: "Administration" },
    description: {
      fr: "Moderation et supervision",
      en: "Moderation and supervision",
    },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "elus",
    categoryId: "pilotage",
    spaceId: "decide",
    priority: 40,
    kind: "section",
    route: "/sections/elus",
    label: { fr: "Collectivites", en: "Local authorities" },
    description: { fr: "Suivi institutionnel", en: "Institutional tracking" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "new",
    categoryId: "terrain",
    spaceId: "execute",
    priority: 10,
    kind: "app-route",
    route: "/actions/new",
    label: { fr: "Declarer", en: "Declare" },
    description: { fr: "Nouvelle action", en: "New action" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "map",
    categoryId: "terrain",
    spaceId: "execute",
    priority: 20,
    kind: "app-route",
    route: "/actions/map",
    label: { fr: "Carte", en: "Map" },
    description: { fr: "Vue géolocalisée", en: "Geo view" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "history",
    categoryId: "terrain",
    spaceId: "supervise",
    priority: 20,
    kind: "app-route",
    route: "/actions/history",
    label: { fr: "Historique", en: "History" },
    description: { fr: "Actions passees", en: "Past actions" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "route",
    categoryId: "terrain",
    spaceId: "execute",
    priority: 30,
    kind: "section",
    route: "/sections/route",
    label: { fr: "Itineraire IA", en: "AI routing" },
    description: { fr: "Planification parcours", en: "Route planning" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "recycling",
    categoryId: "terrain",
    spaceId: "prepare",
    priority: 30,
    kind: "section",
    route: "/sections/recycling",
    label: { fr: "Seconde vie", en: "Recycling" },
    description: { fr: "Valorisation dechets", en: "Waste reuse" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "climate",
    categoryId: "analysis",
    spaceId: "decide",
    priority: 50,
    kind: "section",
    route: "/sections/climate",
    label: { fr: "Climat", en: "Climate" },
    description: { fr: "Indicateurs climat", en: "Climate metrics" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "weather",
    categoryId: "analysis",
    spaceId: "supervise",
    priority: 30,
    kind: "section",
    route: "/sections/weather",
    label: { fr: "Météo", en: "Weather" },
    description: { fr: "Conditions terrain", en: "Field conditions" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "compare",
    categoryId: "analysis",
    spaceId: "decide",
    priority: 45,
    kind: "section",
    route: "/sections/compare",
    label: { fr: "Comparaison", en: "Comparison" },
    description: { fr: "Territoires", en: "Territories" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "guide",
    categoryId: "resources",
    spaceId: "prepare",
    priority: 10,
    kind: "section",
    route: "/sections/guide",
    label: { fr: "Guide pratique", en: "Practical guide" },
    description: { fr: "Mode operatoire", en: "How-to guidance" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "kit",
    categoryId: "resources",
    spaceId: "prepare",
    priority: 20,
    kind: "section",
    route: "/sections/kit",
    label: { fr: "Kit terrain", en: "Field kit" },
    description: { fr: "Checklist et materiel", en: "Checklist and equipment" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "sandbox",
    categoryId: "resources",
    spaceId: "supervise",
    priority: 40,
    kind: "section",
    route: "/sections/sandbox",
    label: { fr: "Sandbox", en: "Sandbox" },
    description: {
      fr: "Tests et verification",
      en: "Testing and verification",
    },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "community",
    categoryId: "community",
    spaceId: "execute",
    priority: 40,
    kind: "section",
    route: "/sections/community",
    label: { fr: "Rassemblements", en: "Meetups" },
    description: { fr: "Actions collectives", en: "Collective events" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "gamification",
    categoryId: "community",
    spaceId: "decide",
    priority: 60,
    kind: "section",
    route: "/sections/gamification",
    label: { fr: "Classement", en: "Leaderboard" },
    description: { fr: "Badges et progression", en: "Badges and progress" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "actors",
    categoryId: "community",
    spaceId: "prepare",
    priority: 40,
    kind: "section",
    route: "/sections/actors",
    label: { fr: "Partenaires", en: "Partners" },
    description: { fr: "Reseau engage", en: "Engaged network" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "annuaire",
    categoryId: "community",
    spaceId: "prepare",
    priority: 45,
    kind: "section",
    route: "/sections/annuaire",
    label: { fr: "Annuaire Engagement", en: "Engagement Directory" },
    description: { fr: "Associations, commerces, groupes", en: "Associations, biz, groups" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "trash-spotter",
    categoryId: "community",
    spaceId: "supervise",
    priority: 50,
    kind: "section",
    route: "/sections/trash-spotter",
    label: { fr: "Trash Spotter", en: "Trash Spotter" },
    description: { fr: "Signalements", en: "Reports" },
    availability: "available",
    implementation: "finalized",
  },
] as const satisfies readonly RubriqueDefinition[];

export type Rubrique = (typeof RUBRIQUE_REGISTRY)[number];
export type SectionRubrique = Extract<Rubrique, { kind: "section" }>;
export type SectionRubriqueDefinition = Extract<
  RubriqueDefinition,
  { kind: "section" }
>;
export type SectionId = SectionRubrique["id"];
export type FinalizedSectionId = Extract<
  SectionRubrique,
  { implementation: "finalized" }
>["id"];

function hasValidRoute(rubrique: Rubrique): boolean {
  if (!rubrique.route.startsWith("/")) {
    return false;
  }
  if (rubrique.kind === "section") {
    return rubrique.route === `/sections/${rubrique.id}`;
  }
  return true;
}

export function isRubriqueVisible(rubrique: Rubrique): boolean {
  return rubrique.availability === "available" && hasValidRoute(rubrique);
}

export function getVisibleRubriquesByCategory(
  categoryId: RubriqueCategory["id"],
): Rubrique[] {
  return RUBRIQUE_REGISTRY.filter(
    (rubrique) =>
      rubrique.categoryId === categoryId && isRubriqueVisible(rubrique),
  ).sort(
    (a, b) => a.priority - b.priority || a.label.fr.localeCompare(b.label.fr),
  );
}

export function getVisibleRubriquesBySpace(
  spaceId: RubriqueSpaceId,
): Rubrique[] {
  return RUBRIQUE_REGISTRY.filter(
    (rubrique) => rubrique.spaceId === spaceId && isRubriqueVisible(rubrique),
  ).sort(
    (a, b) => a.priority - b.priority || a.label.fr.localeCompare(b.label.fr),
  );
}

export function normalizeSectionId(sectionId: string): string {
  return sectionId.trim().toLowerCase();
}

export function getSectionRubriqueById(
  sectionId: string,
): SectionRubriqueDefinition | undefined {
  const rubrique = RUBRIQUE_REGISTRY.find(
    (item) => item.kind === "section" && item.id === sectionId,
  );
  return rubrique as SectionRubriqueDefinition | undefined;
}

export function isSectionRouteEnabled(
  sectionId: string,
): sectionId is SectionId {
  const rubrique = getSectionRubriqueById(sectionId);
  return Boolean(rubrique && isRubriqueVisible(rubrique));
}

export function getSectionRouteParams(): Array<{ sectionId: SectionId }> {
  return RUBRIQUE_REGISTRY.filter(
    (rubrique): rubrique is SectionRubrique =>
      rubrique.kind === "section" && isRubriqueVisible(rubrique),
  ).map((rubrique) => ({ sectionId: rubrique.id }));
}

export function getPendingSectionRubriques(): SectionRubriqueDefinition[] {
  const registry = RUBRIQUE_REGISTRY as readonly RubriqueDefinition[];
  return registry.filter(
    (rubrique): rubrique is SectionRubriqueDefinition =>
      rubrique.kind === "section" &&
      rubrique.implementation === "pending" &&
      isRubriqueVisible(rubrique as Rubrique),
  );
}
