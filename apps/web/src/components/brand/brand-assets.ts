export const BRAND_ASSET_PATHS = {
  compact: "/brand/logo-court.png",
  lightSurface: "/brand/logo-grand-clair.png",
  darkSurface: "/brand/logo-grand-sombre.png",
  social: "/brand/github-social-preview.png",
} as const;

export const BRAND_ASSET_DIMENSIONS = {
  compact: { width: 1254, height: 1254 },
  lightSurface: { width: 1916, height: 821 },
  darkSurface: { width: 2172, height: 724 },
  social: { width: 1280, height: 640 },
} as const;

export type BrandLogoVariant = "compact" | "lightSurface" | "darkSurface";
