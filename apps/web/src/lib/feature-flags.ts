export const FEATURE_FLAGS = {
  parcoursNavV2: process.env.NEXT_PUBLIC_FF_PARCOURS_NAV_V2 !== "0",
  pageTemplateV2: process.env.NEXT_PUBLIC_FF_PAGE_TEMPLATE_V2 !== "0",
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return FEATURE_FLAGS[flag];
}
