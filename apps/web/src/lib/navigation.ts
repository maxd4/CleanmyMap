import type { Locale } from "@/lib/ui/preferences";
import { RUBRIQUE_CATEGORIES, getVisibleRubriquesByCategory, type LocalizedText } from "@/lib/sections-registry";

export type NavigationCategory = {
  id: string;
  label: LocalizedText;
  items: NavigationItem[];
};

export type NavigationItem = {
  id: string;
  href: string;
  label: LocalizedText;
  description: LocalizedText;
};

export const NAVIGATION_CATEGORIES: NavigationCategory[] = RUBRIQUE_CATEGORIES.map((category) => ({
  id: category.id,
  label: category.label,
  items: getVisibleRubriquesByCategory(category.id).map((rubrique) => ({
    id: rubrique.id,
    href: rubrique.route,
    label: rubrique.label,
    description: rubrique.description,
  })),
})).filter((category) => category.items.length > 0);

export function getNavigationLabels(locale: Locale) {
  return {
    navTitle: locale === "fr" ? "Navigation du site" : "Site navigation",
    categoryCount: locale === "fr" ? `${NAVIGATION_CATEGORIES.length} categories` : `${NAVIGATION_CATEGORIES.length} categories`,
  };
}
