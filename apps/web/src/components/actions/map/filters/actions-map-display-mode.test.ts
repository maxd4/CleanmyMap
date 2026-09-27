import { describe, expect, it } from "vitest";
import { ACTIONS_MAP_DISPLAY_MODE_OPTIONS } from "./actions-map-display-mode";

describe("actions map display mode", () => {
  it("keeps the compact control labels and canonical order", () => {
    expect(ACTIONS_MAP_DISPLAY_MODE_OPTIONS).toEqual([
      { value: "observed", label: "Observé" },
      { value: "projected_today", label: "Projeté aujourd’hui" },
    ]);
  });
});
