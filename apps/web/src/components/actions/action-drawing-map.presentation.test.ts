import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACTION_DRAWING_EDIT_COLOR } from "./action-drawing-map.presentation";

const source = readFileSync(new URL("./action-drawing-map.tsx", import.meta.url), "utf8");

describe("ActionDrawingMap presentation contract", () => {
  it("uses one neutral editing color instead of predicting a scientific color", () => {
    expect(ACTION_DRAWING_EDIT_COLOR).toBe("#334155");
    expect(source).toContain("ACTION_DRAWING_EDIT_COLOR");
    expect(source).not.toContain("computePollutionScore");
    expect(source).not.toContain("resolveDynamicColor");
    expect(source).not.toContain("wasteKg?:");
    expect(source).not.toContain("butts?:");
    expect(source).not.toContain("isCleanPlace?:");
  });
});
