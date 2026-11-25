export const PILOTAGE_PAGE_TABS = ["summary", "operations", "priorities", "analysis", "tools"] as const;
export type PilotagePageTab = (typeof PILOTAGE_PAGE_TABS)[number];

export function resolvePilotagePageTab(tab: unknown, operations: unknown): PilotagePageTab {
  if (operations === "1") return "operations";
  return PILOTAGE_PAGE_TABS.find((candidate) => candidate === tab) ?? "summary";
}

export function pilotagePageTabHref(tab: PilotagePageTab): string {
  if (tab === "summary") return "/pilotage";
  if (tab === "operations") return "/pilotage?operations=1";
  return `/pilotage?tab=${tab}`;
}

export function resolveLegacyPilotageAnchor(hash: string, tab: string | null, operations: string | null): PilotagePageTab | null {
  if (tab !== null || operations !== null) return null;
  return hash === "#decideurs" || hash === "#gouvernance" ? "tools" : null;
}
