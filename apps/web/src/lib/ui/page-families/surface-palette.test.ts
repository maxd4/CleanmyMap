import { describe, expect, it } from "vitest";
import { resolvePageSurfacePalette, SURFACE_PALETTES, getSurfacePaletteCssVariables } from "./surface-palette";

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(start => {
    const v = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe("premium family palette", () => {
  it.each([
    ["/dashboard", "pilotage"],
    ["/sections/rejoindre-un-formulaire", "agir"],
    ["/actions/map", "cartographie"],
    ["/reports", "impact"],
    ["/methodologie", "impact"],
    ["/sections/annuaire", "reseau"],
    ["/partners/dashboard", "reseau"],
    ["/learn/comprendre", "apprendre"],
    ["/onboarding/localisation", "auth"],
    ["/mentions-legales", "legal"],
    ["/reglages", "systeme"],
    ["/admin", "admin"],
    ["/", null],
    ["/accueil", null],
    ["/explorer", null],
    ["/prints/report", null],
    ["/sign-in", null],
    ["/sign-up", null],
    [null, null],
  ] as const)("resolves %s without duplicating the route registry", (route, expected) => {
    expect(resolvePageSurfacePalette(route)).toBe(expected);
  });

  it("keeps text readable at both gradient endpoints and in dark surfaces", () => {
    for (const palette of Object.values(SURFACE_PALETTES)) {
      for (const background of [palette.primary, palette.deep]) {
        expect(contrast("#FFFFFF", background)).toBeGreaterThanOrEqual(4.5);
      }
      for (const background of [palette.soft, palette.tint]) {
        expect(contrast("#0F172A", background)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette.primary, background)).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(palette.primary, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
      expect(contrast("#F8FAFC", palette.dark)).toBeGreaterThanOrEqual(4.5);
    }
    expect(getSurfacePaletteCssVariables("reseau")["--cmm-family-primary"]).toBe("#9D174D");
  });
});
