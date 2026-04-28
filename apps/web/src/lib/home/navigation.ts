import { NavigationItem } from "@/lib/navigation";

export const BLOCK_PREVIEW_PRIORITY: Record<
  "home" | "act" | "visualize" | "impact" | "network" | "learn" | "pilot",
  Partial<Record<NavigationItem["id"], number>>
> = {
  home: {
    dashboard: 1,
    profile: 2,
  },
  act: {
    new: 1,
    route: 2,
    "trash-spotter": 3,
  },
  visualize: {
    map: 1,
    sandbox: 2,
    weather: 3,
  },
  impact: {
    reports: 1,
    gamification: 2,
  },
  network: {
    network: 1,
    annuaire: 2,
    community: 3,
    messagerie: 4,
    "open-data": 5,
    funding: 6,
    actors: 7,
  },
  learn: {
    hub: 1,
    guide: 2,
    climate: 3,
    recycling: 4,
  },
  pilot: {
    admin: 1,
    sponsor: 2,
    elus: 3,
    godmode: 4,
  },
};

export function sortItemsForPreview(
  blockId: keyof typeof BLOCK_PREVIEW_PRIORITY,
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
