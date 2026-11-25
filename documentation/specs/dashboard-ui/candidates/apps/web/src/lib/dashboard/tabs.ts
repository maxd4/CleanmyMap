import { DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";

export const DASHBOARD_TABS = ["today", "notifications", "collective", "engagement", "account"] as const;
export type DashboardTab = (typeof DASHBOARD_TABS)[number];

export function resolveDashboardTab(value: string | string[] | undefined): DashboardTab {
  return DASHBOARD_TABS.find((tab) => tab === value) ?? "today";
}

export function dashboardTabHref(tab: DashboardTab): string {
  if (tab === "today") return DASHBOARD_ROUTE;
  return `${DASHBOARD_ROUTE}?tab=${tab}${tab === "notifications" ? "#notifications" : tab === "engagement" ? "#parrainage" : ""}`;
}

export function resolveLegacyDashboardAnchor(hash: string, tab: string | null): DashboardTab | null {
  if (tab !== null) return null;
  if (hash === "#notifications") return "notifications";
  if (hash === "#parrainage") return "engagement";
  return null;
}
