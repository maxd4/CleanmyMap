import { describe, expect, it } from "vitest";
import { buildLightCelebrationPreview } from "./light-celebrations-panel";

describe("buildLightCelebrationPreview", () => {
  it("builds a gentle preview payload in French", () => {
    const preview = buildLightCelebrationPreview("fr");

    expect(preview).toMatchObject({
      title: "Palier atteint",
      tone: "generic",
      icon: "✨",
      durationMs: 2800,
      confetti: true,
      sound: true,
      source: "light-celebrations-panel",
    });
    expect(preview.message).toContain("toast");
  });

  it("builds a gentle preview payload in English", () => {
    const preview = buildLightCelebrationPreview("en");

    expect(preview.title).toBe("Threshold reached");
    expect(preview.message).toContain("light confetti");
  });
});
