import type { WasteCategoryDefinition } from "./types";

export function getWasteCategoryTextSources(
  category: WasteCategoryDefinition,
): string[] {
  return [
    category.labels.fr,
    category.labels.en,
    ...category.examples.flatMap((example) => [example.fr, example.en]),
    ...(category.aliases ?? []).flatMap((alias) => [alias.fr, alias.en]),
    ...category.pedagogicalTags,
  ];
}
