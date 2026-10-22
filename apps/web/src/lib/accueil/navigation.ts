import type { NavigationBlockId, NavigationItem } from "@/lib/navigation";

export const BLOCK_PREVIEW_PRIORITY: Record<
  NavigationBlockId,
  Partial<Record<NavigationItem["id"], number>>
> = {
  home: {
    dashboard: 1,
    explorer: 2,
    pilotage: 3,
    admin: 4,
    sponsor: 5,
    funding: 6,
    elus: 7,
  },
  act: {
    "rejoindre-une-action": 1,
    new: 2,
    signalement: 3,
  },
  visualize: {
    map: 1,
    reports: 3,
    gamification: 4,
  },
  impact: {},
  network: {
    messagerie: 1,
    annuaire: 2,
    "open-data": 3,
    funding: 4,
  },
  connect: { messagerie: 1, dm: 2 },
  learn: {
    "learn-comprendre": 1,
    "learn-sentrainer": 2,
    "learn-bonnes-pratiques": 3,
  },
};

export function sortItemsForPreview(
  blockId: NavigationBlockId,
  items: NavigationItem[],
): NavigationItem[] {
  const blockPriority = BLOCK_PREVIEW_PRIORITY[blockId];
  return [...items].sort((a, b) => {
    const pa = blockPriority[a.id] ?? 99;
    const pb = blockPriority[b.id] ?? 99;
    if (pa !== pb) {
      return pa - pb;
    }
    return a.label.fr.localeCompare(b.label.fr, "fr");
  });
}
