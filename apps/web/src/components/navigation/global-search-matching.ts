import type { NavigationItem } from "@/lib/navigation";
import type { Locale } from "@/lib/ui/preferences";

export type GlobalSearchItem = NavigationItem & {
  spaceLabel: string;
  spaceIcon: string;
};

/** Pure matching for the already-accessible global-search index. */
export function filterGlobalSearchItems(
  items: readonly GlobalSearchItem[],
  query: string,
  locale: Locale,
): GlobalSearchItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  if (!normalizedQuery) {
    return [];
  }

  const searchTerms = normalizedQuery.split(/\s+/u);
  return items
    .filter((item) => {
      const searchableFields = [
        item.label[locale],
        item.description[locale],
        item.spaceLabel,
        (item.searchKeywords?.[locale] ?? []).join(" "),
      ].map((field) => field.toLocaleLowerCase(locale));

      return searchTerms.every((term) =>
        searchableFields.some((field) => field.includes(term)),
      );
    })
    .slice(0, 8);
}
