export const APP_NAVIGATION_RIBBON_VARIANTS = ["classic", "meniscus"] as const;

export type AppNavigationRibbonVariant =
  (typeof APP_NAVIGATION_RIBBON_VARIANTS)[number];

// Single visual selector for the desktop central navigation ribbon.
// Keep the published default on classic until a release explicitly opts into meniscus.
// The public build-time override is used by the visual validation lane only;
// invalid values fail closed to the published classic presentation.
const configuredVariant = process.env.NEXT_PUBLIC_CMM_NAVIGATION_RIBBON_VARIANT;

export const APP_NAVIGATION_RIBBON_VARIANT: AppNavigationRibbonVariant =
  configuredVariant === "meniscus" ? "meniscus" : "classic";
