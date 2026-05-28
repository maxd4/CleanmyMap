import { describe, expect, it } from "vitest";
import { HOME_ALIAS_ROUTE, HOME_ROUTE } from "@/lib/home-routes";
import { resolveFooterVariant, shouldUseFullFooter } from "./footer-variant";

describe("footer variant", () => {
  it("uses the full footer for the homepage and its compatibility alias", () => {
    expect(shouldUseFullFooter(HOME_ROUTE)).toBe(true);
    expect(shouldUseFullFooter(HOME_ALIAS_ROUTE)).toBe(true);
    expect(resolveFooterVariant(HOME_ROUTE)).toBe("full");
  });

  it("keeps the compact footer on unrelated app routes", () => {
    expect(shouldUseFullFooter("/sign-in")).toBe(false);
    expect(resolveFooterVariant("/sign-in")).toBe("compact");
  });
});
