import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  BRAND_ASSET_DIMENSIONS,
  BRAND_ASSET_PATHS,
} from "./brand-assets";
import { BrandLogo } from "./brand-logo";

describe("CleanMyMap brand assets", () => {
  it("keeps one deterministic registry with native geometry", () => {
    expect(BRAND_ASSET_PATHS).toEqual({
      compact: "/brand/logo-court.png",
      lightSurface: "/brand/logo-grand-clair.png",
      darkSurface: "/brand/logo-grand-sombre.png",
      social: "/brand/github-social-preview.png",
    });
    expect(BRAND_ASSET_DIMENSIONS).toEqual({
      compact: { width: 1254, height: 1254 },
      lightSurface: { width: 1916, height: 821 },
      darkSurface: { width: 2172, height: 724 },
      social: { width: 1280, height: 640 },
    });
    expect(new Set(Object.values(BRAND_ASSET_PATHS)).size).toBe(4);
    expect(Object.values(BRAND_ASSET_PATHS).every((path) => path.endsWith(".png"))).toBe(true);
  });

  it.each([
    ["compact", "logo-court.png"],
    ["lightSurface", "logo-grand-clair.png"],
    ["darkSurface", "logo-grand-sombre.png"],
  ] as const)("renders the %s variant through the shared image primitive", (variant, assetName) => {
    const markup = renderToStaticMarkup(<BrandLogo variant={variant} />);

    expect(markup).toContain(assetName);
  });
});
