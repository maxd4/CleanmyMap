import { NavigationItem } from "@/lib/navigation";

export const BLOCK_PREVIEW_PRIORITY: Record<
  "home" | "act" | "visualize" | "impact" | "network" | "learn" | "pilot",
  Partial<Record<NavigationItem["id"], number>>
> = {
  home: {
    dashboard: 1,
    explorer: 2,
    profile: 3,
    feedback: 4,
    pilotage: 5,
    admin: 6,
    sponsor: 7,
    elus: 8,
    godmode: 9,
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
    annuaire: 2,
    community: 3,
    messagerie: 4,
    "open-data": 5,
    funding: 6,
    actors: 7,
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
