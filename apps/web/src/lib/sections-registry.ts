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
    id: "profile",
    categoryId: "pilotage",
    spaceId: "decide",
    priority: 15,
    kind: "app-route",
    route: "/profil",
    label: { fr: "Compte", en: "Account" },
    description: { fr: "Parametres de compte", en: "Account settings" },
    availability: "available",
    implementation: "finalized",
  },
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
    label: { fr: "Rapports d'impact", en: "Impact reports" },
    description: {
      fr: "Synthese d'impact, exports et controle",
      en: "Impact synthesis, exports and control",
    },
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
    label: { fr: "Elus & Coordinateur", en: "Authorities & Coordinators" },
    description: {
      fr: "Besoins/resultats pour arbitrage public et coordination locale",
      en: "Needs/results for public arbitration and local coordination",
    },
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
    availability: "hidden",
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
    label: { fr: "Developpement durable", en: "Sustainability" },
    description: {
      fr: "ODD, limites planetaires et impact local",
      en: "SDGs, planetary boundaries and local impact",
    },
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
    id: "community",
    categoryId: "community",
    spaceId: "execute",
    priority: 40,
    kind: "section",
    route: "/sections/community",
    label: { fr: "Operations collectives", en: "Collective operations" },
    description: {
      fr: "Ressources, rassemblements et historique",
      en: "Resources, gatherings and history",
    },
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
    label: { fr: "Discussion", en: "Discussion" },
    description: {
      fr: "Espace entraide locale + formulaire bugs",
      en: "Local mutual aid + bug form",
    },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "open-data",
    categoryId: "community",
    spaceId: "decide",
    priority: 47,
    kind: "section",
    route: "/sections/open-data",
    label: { fr: "Donnees ouvertes", en: "Open data" },
    description: {
      fr: "Open data, API et export JSON pour recherche et villes",
      en: "Open data, API and JSON export for research and cities",
    },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "funding",
    categoryId: "community",
    spaceId: "decide",
    priority: 48,
    kind: "section",
    route: "/sections/funding",
    label: { fr: "Financement / sponsoring", en: "Funding / sponsoring" },
    description: {
      fr: "Sponsoring de zones, mecenat ecologique et appel au don",
      en: "Zone sponsorship, ecological patronage and donations",
    },
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
