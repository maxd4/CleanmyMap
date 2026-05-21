import { describe, expect, it } from "vitest";
import {
  buildRibbonChrome,
  compositeColors,
  mixColors,
  parseCssColor,
  relativeLuminance,
} from "./app-navigation-ribbon-theme";

describe("app-navigation-ribbon-theme", () => {
  it("parses common CSS color formats", () => {
    expect(parseCssColor("#0f172a")).toEqual({ r: 15, g: 23, b: 42, a: 1 });
    expect(parseCssColor("#0f172a80")).toEqual({ r: 15, g: 23, b: 42, a: 128 / 255 });
    expect(parseCssColor("rgb(15, 23, 42)")).toEqual({ r: 15, g: 23, b: 42, a: 1 });
    expect(parseCssColor("rgba(255, 255, 255, 0.5)")).toEqual({
      r: 255,
      g: 255,
      b: 255,
      a: 0.5,
    });
    expect(parseCssColor("rgb(15, 23)")).toBeNull();
    expect(parseCssColor("#12345")).toBeNull();
  });

  it("composites translucent colors over a backdrop", () => {
    expect(
      compositeColors(
        { r: 255, g: 255, b: 255, a: 0.5 },
        { r: 0, g: 0, b: 0, a: 1 },
      ),
    ).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it("mixes two colors by weight", () => {
    expect(
      mixColors(
        { r: 255, g: 255, b: 255 },
        { r: 0, g: 0, b: 0 },
        0.25,
      ),
    ).toEqual({ r: 64, g: 64, b: 64, a: 1 });
  });

  it("keeps the ribbon light on bright surfaces and still tinted on dark ones", () => {
    const lightChrome = buildRibbonChrome({
      r: 246,
      g: 248,
      b: 252,
      a: 1,
    });
    const darkChrome = buildRibbonChrome({
      r: 8,
      g: 15,
      b: 32,
      a: 1,
    });

    expect(lightChrome.backgroundImage).not.toBe(darkChrome.backgroundImage);
    expect(
      relativeLuminance(
        parseCssColor(lightChrome.backgroundColor) ?? { r: 0, g: 0, b: 0, a: 1 },
      ),
    ).toBeGreaterThan(
      relativeLuminance(
        parseCssColor(darkChrome.backgroundColor) ?? { r: 0, g: 0, b: 0, a: 1 },
      ),
    );
    expect(relativeLuminance({ r: 246, g: 248, b: 252 })).toBeGreaterThan(
      relativeLuminance({ r: 8, g: 15, b: 32 }),
    );
  });
});
