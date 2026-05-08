import type { Locale } from "@/lib/ui/preferences";
import type {
  Rubrique,
  RubriqueCategory,
  RubriqueDefinition,
  RubriqueSpaceId,
  SectionId,
  SectionRubrique,
  SectionRubriqueDefinition,
} from "./types";
import { RUBRIQUE_REGISTRY } from "./config";

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

/**
 * Returns visible rubriques for a given category.
 * If called frequently, consider memoizing the result using useMemo on the caller side.
 */
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

/**
 * Returns visible rubriques for a given space.
 * If called frequently, consider memoizing the result using useMemo on the caller side.
 */
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
