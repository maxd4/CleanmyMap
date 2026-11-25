export const ADMIN_COCKPIT_TABS = ["summary", "moderation", "inbox", "audit", "tools", "advanced"] as const;
export type AdminCockpitTab = (typeof ADMIN_COCKPIT_TABS)[number];

export function resolveAdminCockpitTab(value: unknown, moderationPreset: "signalements" | null, isMax: boolean): AdminCockpitTab {
  if (moderationPreset === "signalements") return "moderation";
  const tab = ADMIN_COCKPIT_TABS.find((candidate) => candidate === value) ?? "summary";
  return tab === "advanced" && !isMax ? "summary" : tab;
}

export function adminCockpitHref(tab: AdminCockpitTab): string {
  return tab === "summary" ? "/admin" : `/admin?tab=${tab}`;
}

export function resolveLegacyAdminAnchor(hash: string, tab: string | null, moderation: string | null): AdminCockpitTab | null {
  if (tab !== null || moderation !== null) return null;
  if (hash === "#workflow-administration") return "moderation";
  return null;
}
