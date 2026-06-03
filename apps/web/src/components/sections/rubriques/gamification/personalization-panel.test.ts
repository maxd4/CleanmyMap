import { describe, expect, it } from "vitest";
import { buildPersonalizationSnapshot } from "./personalization-panel";

describe("buildPersonalizationSnapshot", () => {
  it("describes the current default personalization in French", () => {
    expect(buildPersonalizationSnapshot("fr", "mixed", "exhaustif")).toEqual({
      localeLabel: "Français",
      themeLabel: "Mixte",
      displayModeLabel: "Exhaustif",
      displayModeHint: "Charte premium complète active",
    });
  });

  it("describes future display modes when they become available", () => {
    expect(buildPersonalizationSnapshot("en", "dark", "minimaliste")).toEqual({
      localeLabel: "English",
      themeLabel: "Dark",
      displayModeLabel: "Minimal",
      displayModeHint: "Light modes coming soon",
    });
  });
});
