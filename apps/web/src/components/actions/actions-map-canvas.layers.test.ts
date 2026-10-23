import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_VISIBLE_MAP_LAYERS,
  MAP_LAYER_LABELS,
  toggleVisibleMapLayer,
} from "./actions-map-canvas.layers";

describe("actions map canvas layers", () => {
  it("names the combined geometry layer with parcours and zones", () => {
    expect(MAP_LAYER_LABELS.shapes).toBe("Parcours & zones");
  });

  it("starts with all local layers visible", () => {
    expect(DEFAULT_VISIBLE_MAP_LAYERS).toEqual({
      points: true,
      shapes: true,
      infrastructure: true,
      trashSpotter: true,
      plasticOrigins: false,
    });
  });

  it("toggles a single layer without mutating the others", () => {
    const next = toggleVisibleMapLayer(DEFAULT_VISIBLE_MAP_LAYERS, "shapes");

    expect(next).toEqual({
      points: true,
      shapes: false,
      infrastructure: true,
      trashSpotter: true,
      plasticOrigins: false,
    });
    expect(DEFAULT_VISIBLE_MAP_LAYERS).toEqual({
      points: true,
      shapes: true,
      infrastructure: true,
      trashSpotter: true,
      plasticOrigins: false,
    });
  });

  it("keeps historical Plastic Origins disabled by default", () => {
    expect(MAP_LAYER_LABELS.plasticOrigins).toBe("Plastic Origins | Observations historiques");
    expect(DEFAULT_VISIBLE_MAP_LAYERS.plasticOrigins).toBe(false);
  });

  it("keeps every registered layer documented on the canonical actions map page", () => {
    const documentation = readFileSync(
      fileURLToPath(new URL(
        "../../../../../documentation/pages_site/routes/03-cartographie-impact/actions-map/actions-map-README.md",
        import.meta.url,
      )),
      "utf8",
    );
    const documentedLayerRows = documentation
      .split("\n")
      .filter((line) => line.startsWith("| "))
      .map((line) => line.replaceAll("\\|", "|"));

    for (const label of Object.values(MAP_LAYER_LABELS)) {
      expect(documentedLayerRows.some((row) => row.includes(label))).toBe(true);
    }
  });
});
