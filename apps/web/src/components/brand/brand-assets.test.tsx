import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  BRAND_ASSET_DIMENSIONS,
  BRAND_ASSET_PATHS,
} from "./brand-assets";
import { BrandLogo } from "./brand-logo";

describe("CleanMyMap brand assets", () => {
  it("keeps one deterministic asset and native geometry for every supported variant", () => {
    expect(BRAND_ASSET_PATHS).toEqual({
      compact: "/brand/logo-court.png",
      light: "/brand/logo-grand-clair.png",
      dark: "/brand/logo-grand-sombre.png",
    });
    expect(BRAND_ASSET_DIMENSIONS).toEqual({
      compact: { width: 1254, height: 1254 },
      light: { width: 1916, height: 821 },
      dark: { width: 2172, height: 724 },
    });
    expect(new Set(Object.values(BRAND_ASSET_PATHS)).size).toBe(3);
    expect(Object.values(BRAND_ASSET_PATHS).every((path) => path.endsWith(".png"))).toBe(true);
  });

  it.each([
    ["compact", "logo-court.png"],
    ["light", "logo-grand-clair.png"],
    ["dark", "logo-grand-sombre.png"],
  ] as const)("renders the %s variant through the shared image primitive", (variant, assetName) => {
    const markup = renderToStaticMarkup(<BrandLogo variant={variant} />);

    expect(markup).toContain(assetName);
  });
});
