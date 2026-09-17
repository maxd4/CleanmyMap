import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  new URL("../../app/(app)/actions/map/page-client.tsx", import.meta.url),
  "utf8",
);
const immersiveLayoutSource = readFileSync(
  new URL("../actions/map-feed/_layouts/immersive-layout.tsx", import.meta.url),
  "utf8",
);

describe("ActionStoriesCarousel consumer boundary", () => {
  it("keeps the shared carousel available to immersive hosts without mounting it on the public map page", () => {
    expect(pageSource).not.toContain("ActionStoriesCarousel");
    expect(pageSource).not.toContain("Dernières actions");
    expect(immersiveLayoutSource).toContain("ActionStoriesCarousel");
    expect(immersiveLayoutSource).toContain("showStoriesCarousel");
  });

  it("does not make generic urgency or stock photography part of the map page contract", () => {
    expect(pageSource).not.toContain("Action urgente");
    expect(pageSource).not.toContain("images.unsplash.com");
  });
});
