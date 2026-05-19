import { describe, expect, it } from "vitest";
import { buildHomePillars } from "./config";

describe("buildHomePillars", () => {
  it("renders the five homepage cards in the expected order", () => {
    const pillars = buildHomePillars((spaceId) => ({
      mobile: [spaceId],
      desktop: [spaceId],
    }));

    expect(pillars).toHaveLength(5);
    expect(pillars.map((pillar) => pillar.title)).toEqual([
      "Accueil et Pilotage",
      "Agir",
      "Cartographie et Impact",
      "Réseau & Discussions",
      "Apprendre",
    ]);
  });
});
