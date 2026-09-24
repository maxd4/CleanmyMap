import { readFileSync } from "node:fs";
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

  it("serves Next App Router icons derived at dedicated web sizes", () => {
    const icon = readFileSync(new URL("../../app/icon.png", import.meta.url));
    const appleIcon = readFileSync(
      new URL("../../app/apple-icon.png", import.meta.url),
    );
    const favicon = readFileSync(new URL("../../app/favicon.ico", import.meta.url));
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    expect(icon.subarray(0, 8)).toEqual(pngSignature);
    expect([icon.readUInt32BE(16), icon.readUInt32BE(20)]).toEqual([512, 512]);
    expect(appleIcon.subarray(0, 8)).toEqual(pngSignature);
    expect([appleIcon.readUInt32BE(16), appleIcon.readUInt32BE(20)]).toEqual([
      180, 180,
    ]);
    expect(favicon.readUInt16LE(0)).toBe(0);
    expect(favicon.readUInt16LE(2)).toBe(1);
    expect(favicon.readUInt16LE(4)).toBe(1);
    expect(favicon.readUInt8(6)).toBe(48);
    expect(favicon.subarray(22, 30)).toEqual(pngSignature);
  });
});
