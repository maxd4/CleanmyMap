import { describe, expect, it } from "vitest";
import {
  APP_NAVIGATION_RIBBON_VARIANT,
  APP_NAVIGATION_RIBBON_VARIANTS,
} from "./app-navigation-ribbon-variant";

describe("app-navigation-ribbon-variant", () => {
  it("publishes one typed selector with classic as the unchanged default", () => {
    expect(APP_NAVIGATION_RIBBON_VARIANTS).toEqual(["classic", "meniscus"]);
    expect(APP_NAVIGATION_RIBBON_VARIANT).toBe("classic");
  });
});
