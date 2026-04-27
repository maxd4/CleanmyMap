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
  { id: "community", label: { fr: "Communauté", en: "Community" } },
] as const satisfies readonly RubriqueCategory[];

export const RUBRIQUE_REGISTRY = [
  {
    id: "profile",
    categoryId: "pilotage",
    spaceId: "decide",
    priority: 15,
    kind: "app-route",
    route: "/profil",
    label: { fr: "Profil & impact", en: "Account" },
    description: { fr: "Paramètres du compte et impact", en: "Account settings and impact" },
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
    description: { fr: "Vue synthèse", en: "Overview" },
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
      fr: "Synthèse d'impact, exports et contrôle",
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
      fr: "Modération et supervision",
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
    label: { fr: "Gouvernance", en: "Governance" },
    description: {
      fr: "Besoins et résultats pour la coordination publique",
      en: "Needs and results for public coordination",
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
    label: { fr: "Déclarer une action", en: "Declare" },
    description: { fr: "Rendre une action terrain visible", en: "New action" },
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
    label: { fr: "Carte des actions", en: "Map" },
    description: { fr: "Vue géolocalisée de l'engagement", en: "Geo view" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "sandbox",
    categoryId: "terrain",
    spaceId: "execute",
    priority: 22,
    kind: "section",
    route: "/sections/sandbox",
    label: { fr: "Visualiser la carte", en: "Map sandbox" },
    description: {
      fr: "Tester la carte, les filtres et l'état technique avant de démarrer.",
      en: "Test the map, filters and technical health before starting.",
    },
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
    description: { fr: "Actions passées", en: "Past actions" },
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
    label: { fr: "Itinéraire IA", en: "AI routing" },
    description: { fr: "Où agir en priorité aujourd'hui ?", en: "Route planning" },
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
    label: { fr: "Que faire des déchets ?", en: "Recycling" },
    description: { fr: "Valorisation et seconde vie des ressources", en: "Waste reuse" },
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
    label: { fr: "Comprendre l'Enjeu", en: "Sustainability" },
    description: {
      fr: "Limites planétaires et sens de nos actions locales",
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
    label: { fr: "Mode d'emploi", en: "Practical guide" },
    description: { fr: "Comment agir efficacement sur le terrain", en: "How-to guidance" },
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
    label: { fr: "Opérations collectives", en: "Collective operations" },
    description: {
      fr: "Ressources et rassemblements communautaires",
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
    label: { fr: "Progression & Badges", en: "Leaderboard" },
    description: { fr: "Mon impact et mes niveaux de réussite", en: "Badges and progress" },
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
    label: { fr: "Réseau Engagé", en: "Partners" },
    description: { fr: "Partenaires et structures locales mobilisées", en: "Engaged network" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "network",
    categoryId: "community",
    spaceId: "prepare",
    priority: 42,
    kind: "app-route",
    route: "/partners/network",
    label: { fr: "Découvrir le réseau", en: "Discover network" },
    description: {
      fr: "Carte et fiches des partenaires engagés",
      en: "Partner map and cards",
    },
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
    label: { fr: "Annuaire partenaires", en: "Partner directory" },
    description: {
      fr: "Carte, fiches et repères partenaires",
      en: "Partner map, cards and reference points",
    },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "dm",
    categoryId: "community",
    spaceId: "execute",
    priority: 41,
    kind: "section",
    route: "/sections/dm",
    label: { fr: "Messages privés", en: "Private Messages" },
    description: {
      fr: "Échanges directs et confidentiels avec les membres du réseau",
      en: "Direct and confidential messages with network members",
    },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "messagerie",
    categoryId: "community",
    spaceId: "execute",
    priority: 42,
    kind: "section",
    route: "/sections/messagerie",
    label: { fr: "Discussions", en: "Channels" },
    description: {
      fr: "Canaux de discussion collectifs par thématique et territoire",
      en: "Collective discussion channels by theme and territory",
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
    label: { fr: "Observatoire Public", en: "Open data" },
    description: {
      fr: "Données ouvertes et exports pour la recherche",
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
    label: { fr: "Soutenir le Projet", en: "Funding / sponsoring" },
    description: {
      fr: "Mécénat écologique et sponsoring de zones",
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
    label: { fr: "Signalement Déchets", en: "Trash Spotter" },
    description: { fr: "Signaler un hotspot de pollution", en: "Reports" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "hub",
    categoryId: "resources",
    spaceId: "prepare",
    priority: 5,
    kind: "app-route",
    route: "/learn/hub",
    label: { fr: "Hub Éducatif", en: "Educational Hub" },
    description: { fr: "L'Université CleanMyMap : Apprendre et Agir", en: "CleanMyMap University" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "sponsor",
    categoryId: "pilotage",
    spaceId: "decide",
    priority: 35,
    kind: "app-route",
    route: "/sponsor-portal",
    label: { fr: "Portail Décideur", en: "Sponsor Portal" },
    description: { fr: "Analyse ROI et impact territorial", en: "ROI and territorial impact" },
    availability: "available",
    implementation: "finalized",
  },
  {
    id: "godmode",
    categoryId: "pilotage",
    spaceId: "supervise",
    priority: 5,
    kind: "app-route",
    route: "/admin/godmode",
    label: { fr: "God Mode", en: "God Mode" },
    description: { fr: "Espace Master Admin", en: "Master Admin space" },
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
  locale: Locale = "fr",
): Rubrique[] {
  return RUBRIQUE_REGISTRY.filter(
    (rubrique) =>
      rubrique.categoryId === categoryId && isRubriqueVisible(rubrique),
  ).sort(
    (a, b) =>
      a.priority - b.priority ||
      a.label[locale].localeCompare(b.label[locale]),
  );
}

export function getVisibleRubriquesBySpace(
  spaceId: RubriqueSpaceId,
  locale: Locale = "fr",
): Rubrique[] {
  return RUBRIQUE_REGISTRY.filter(
    (rubrique) => rubrique.spaceId === spaceId && isRubriqueVisible(rubrique),
  ).sort(
    (a, b) =>
      a.priority - b.priority ||
      a.label[locale].localeCompare(b.label[locale]),
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
