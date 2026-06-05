import { describe, expect, it } from "vitest";
import { EXPLORER_ROUTE } from "@/lib/accueil-pilotage-routes";
import { HOME_ROUTE } from "@/lib/home-routes";
import { resolveFooterVariant, shouldUseFullFooter } from "./footer-variant";

describe("footer variant", () => {
  it("uses the full footer for the homepage", () => {
    expect(shouldUseFullFooter(HOME_ROUTE)).toBe(true);
    expect(resolveFooterVariant(HOME_ROUTE)).toBe("full");
  });

  it("uses the full footer for the sommaire page", () => {
    expect(shouldUseFullFooter(EXPLORER_ROUTE)).toBe(true);
    expect(resolveFooterVariant(EXPLORER_ROUTE)).toBe("full");
  });

  it("keeps the compact footer on unrelated app routes", () => {
    expect(shouldUseFullFooter("/sign-in")).toBe(false);
    expect(resolveFooterVariant("/sign-in")).toBe("compact");
  });
});
