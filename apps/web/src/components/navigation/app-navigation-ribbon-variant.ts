export const APP_NAVIGATION_RIBBON_VARIANTS = ["classic", "meniscus"] as const;

export type AppNavigationRibbonVariant =
  (typeof APP_NAVIGATION_RIBBON_VARIANTS)[number];

// Single visual selector for the desktop central navigation ribbon.
// Keep the published default on classic until a release explicitly opts into meniscus.
export const APP_NAVIGATION_RIBBON_VARIANT: AppNavigationRibbonVariant = "classic";
