import { NavigationItem } from "@/lib/navigation";

export const BLOCK_PREVIEW_PRIORITY: Record<
  "home" | "act" | "visualize" | "impact" | "network" | "learn" | "pilot",
  Partial<Record<NavigationItem["id"], number>>
> = {
  home: {
    dashboard: 1,
    explorer: 2,
    pilotage: 3,
    admin: 4,
    sponsor: 5,
    elus: 6,
  },
  act: {
    new: 1,
    route: 2,
    weather: 3,
    guide: 4,
    "trash-spotter": 5,
  },
  visualize: {
    map: 1,
    sandbox: 2,
    reports: 3,
    gamification: 4,
  },
  impact: {},
  network: {
    network: 1,
    community: 2,
    feedback: 3,
    messagerie: 4,
    "open-data": 5,
    annuaire: 6,
    funding: 7,
    actors: 8,
  },
  learn: {
    hub: 1,
    climate: 2,
    recycling: 3,
  },
  pilot: {
    admin: 1,
    sponsor: 2,
    elus: 3,
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
