import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ActionsMapCanvasView map surface", () => {
  it("does not animate decorative color or shadow properties on the Leaflet container", () => {
    const source = readFileSync(
      new URL("./actions-map-canvas-view.tsx", import.meta.url),
      "utf8",
    );
    const mapContainerSource = source.slice(
      source.indexOf("<MapContainer"),
      source.indexOf("</MapContainer>"),
    );

    expect(mapContainerSource).not.toContain("transition-colors");
    expect(mapContainerSource).not.toContain("transition-shadow");
  });
});
