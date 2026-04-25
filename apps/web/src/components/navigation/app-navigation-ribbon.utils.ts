import type { NavigationSpace } from "@/lib/navigation";

const RIBBON_PRIMARY_SPACE_ORDER: NavigationSpace["id"][] = [
  "home",
  "act",
  "visualize",
  "impact",
];

const MAX_VISIBLE_SPACE_COUNT = 5;

type RibbonNavigationGroups = {
  primarySpaces: NavigationSpace[];
  secondarySpaces: NavigationSpace[];
  activeSpace: NavigationSpace | null;
};

export function getRibbonNavigationGroups(
  spaces: NavigationSpace[],
  activeSpaceId: NavigationSpace["id"] | null,
): RibbonNavigationGroups {
  const orderedSpaces = [...spaces];
  const primarySpaces: NavigationSpace[] = [];
  const primarySpaceIds = new Set<NavigationSpace["id"]>();

  for (const preferredSpaceId of RIBBON_PRIMARY_SPACE_ORDER) {
    const space = orderedSpaces.find((entry) => entry.id === preferredSpaceId);
    if (!space) {
      continue;
    }

    primarySpaces.push(space);
    primarySpaceIds.add(space.id);
  }

  const activeSpace = activeSpaceId
    ? orderedSpaces.find((space) => space.id === activeSpaceId) ?? null
    : null;

  if (activeSpace && !primarySpaceIds.has(activeSpace.id)) {
    if (primarySpaces.length < MAX_VISIBLE_SPACE_COUNT) {
      primarySpaces.push(activeSpace);
    } else if (primarySpaces.length > 0) {
      primarySpaces[primarySpaces.length - 1] = activeSpace;
    }
    primarySpaceIds.add(activeSpace.id);
  }

  const secondarySpaces = orderedSpaces.filter(
    (space) => !primarySpaceIds.has(space.id),
  );

  return {
    primarySpaces,
    secondarySpaces,
    activeSpace,
  };
}
