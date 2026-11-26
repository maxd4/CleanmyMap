import { buildProfileRoute } from "@/lib/accueil-pilotage-routes";

export const PROFILE_DETAIL_TABS = ["summary", "badges", "referrals", "account"] as const;
export type ProfileDetailTab = typeof PROFILE_DETAIL_TABS[number];

export function resolveProfileDetailTab(value: unknown): ProfileDetailTab {
  return PROFILE_DETAIL_TABS.find(tab => tab === value) ?? "summary";
}
export function profileDetailTabHref(profile: string, tab: ProfileDetailTab): string {
  const route = buildProfileRoute(profile);
  if (tab === "summary") return route;
  return `${route}?tab=${tab}${tab === "referrals" ? "#parrainage" : ""}`;
}
