export const BRAND_ASSET_PATHS = {
  compact: "/brand/logo-court.png",
  light: "/brand/logo-grand-clair.png",
  dark: "/brand/logo-grand-sombre.png",
} as const;

export const BRAND_ASSET_DIMENSIONS = {
  compact: { width: 1254, height: 1254 },
  light: { width: 1916, height: 821 },
  dark: { width: 2172, height: 724 },
} as const;

export type BrandLogoVariant = keyof typeof BRAND_ASSET_PATHS;
