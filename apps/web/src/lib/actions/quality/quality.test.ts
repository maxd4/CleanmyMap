import { describe, expect, it } from "vitest";
import { evaluateActionQuality } from "./quality";
import {
  ACTION_QUALITY_RULESET_VERSION,
  ACTION_QUALITY_WEIGHTS,
} from "./quality-rules";
import type { ActionListItem } from "../types";

function buildItem(overrides: Partial<ActionListItem> = {}): ActionListItem {
  return {
    id: "action-1",
    created_at: "2026-04-01T10:00:00.000Z",
    actor_name: "max",
    action_date: "2026-04-01",
    location_label: "Paris 10e",
    latitude: 48.87,
    longitude: 2.36,
    waste_kg: 12,
    cigarette_butts: 120,
    volunteers_count: 4,
    duration_minutes: 90,
    notes: "ok",
    status: "approved",
    ...overrides,
  };
}

describe("evaluateActionQuality", () => {
  it("uses centralized quality ruleset metadata", () => {
    const result = evaluateActionQuality(
      buildItem(),
      new Date("2026-04-02T00:00:00.000Z"),
    );
    const totalWeight =
      ACTION_QUALITY_WEIGHTS.completeness +
      ACTION_QUALITY_WEIGHTS.coherence +
      ACTION_QUALITY_WEIGHTS.geoloc +
      ACTION_QUALITY_WEIGHTS.traceability +
      ACTION_QUALITY_WEIGHTS.freshness;
    expect(totalWeight).toBe(1);
    expect(result.rulesVersion).toBe(ACTION_QUALITY_RULESET_VERSION);
  });

  it("returns high quality score for complete and coherent records", () => {
    const result = evaluateActionQuality(
      buildItem(),
      new Date("2026-04-02T00:00:00.000Z"),
    );
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.grade).toBe("A");
  });

  it("downgrades score for incomplete stale records", () => {
    const result = evaluateActionQuality(
      buildItem({
        actor_name: null,
        location_label: "x",
        latitude: null,
        longitude: null,
        volunteers_count: 0,
        action_date: "2025-01-01",
      }),
      new Date("2026-04-02T00:00:00.000Z"),
    );
    expect(result.score).toBeLessThan(60);
    expect(result.grade).toBe("C");
    expect(result.flags.length).toBeGreaterThan(0);
  });

  it("does not count a missing waste measurement as complete", () => {
    const result = evaluateActionQuality(
      buildItem({ waste_kg: null }),
      new Date("2026-04-02T00:00:00.000Z"),
    );

    expect(result.breakdown.completeness).toBe(83);
  });

  it("does not count a missing duration measurement as complete at runtime", () => {
    const result = evaluateActionQuality(
      buildItem({ duration_minutes: null } as unknown as Partial<ActionListItem>),
      new Date("2026-04-02T00:00:00.000Z"),
    );

    expect(result.breakdown.completeness).toBe(83);
  });

  it("accepts explicit zero measurements as complete", () => {
    const result = evaluateActionQuality(
      buildItem({ waste_kg: 0, duration_minutes: 0 }),
      new Date("2026-04-02T00:00:00.000Z"),
    );

    expect(result.breakdown.completeness).toBe(100);
  });

  it("does not count an explicitly absent optional runtime value as measured", () => {
    const result = evaluateActionQuality(
      buildItem({ waste_kg: undefined }),
      new Date("2026-04-02T00:00:00.000Z"),
    );

    expect(result.breakdown.completeness).toBe(83);
  });

  it("distinguishes coordinate and geometry evidence", () => {
    const now = new Date("2026-04-02T00:00:00.000Z");
    const withCoordinatesAndDrawing = evaluateActionQuality(
      buildItem({
        manual_drawing: {
          kind: "polyline",
          coordinates: [
            [48.87, 2.36],
            [48.88, 2.37],
          ],
        },
      }),
      now,
    );
    const withDrawingOnly = evaluateActionQuality(
      buildItem({
        latitude: null,
        longitude: null,
        geometry_kind: "polyline",
      }),
      now,
    );

    expect(withCoordinatesAndDrawing.breakdown.geoloc).toBe(100);
    expect(withCoordinatesAndDrawing.flags).not.toContain(
      "Trace geometrique manquante",
    );
    expect(withDrawingOnly.breakdown.geoloc).toBe(65);
    expect(withDrawingOnly.flags).toContain("Centroide geoloc manquant");
  });

  it("flags an invalid observed date instead of treating it as fresh", () => {
    const result = evaluateActionQuality(
      buildItem({ action_date: "not-a-date" }),
      new Date("2026-04-02T00:00:00.000Z"),
    );

    expect(result.breakdown.freshness).toBe(30);
    expect(result.flags).toContain("Date action invalide");
  });

  it.each([
    [8, 85, ""],
    [31, 65, "Fraicheur moyenne"],
    [91, 45, "Donnee ancienne"],
    [181, 25, "Donnee stale"],
  ] as const)(
    "preserves the freshness threshold at %s days",
    (ageDays, expectedScore, expectedFlag) => {
      const now = new Date("2026-04-02T00:00:00.000Z");
      const result = evaluateActionQuality(
        buildItem({
          action_date: new Date(
            now.getTime() - ageDays * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
        now,
      );

      expect(result.breakdown.freshness).toBe(expectedScore);
      if (expectedFlag) {
        expect(result.flags).toContain(expectedFlag);
      } else {
        expect(result.flags).not.toContain("Fraicheur moyenne");
      }
    },
  );
});
