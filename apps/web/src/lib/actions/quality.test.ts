import { describe, expect, it } from "vitest";
import { evaluateActionQuality } from "./quality";
import {
  ACTION_QUALITY_RULESET_VERSION,
  ACTION_QUALITY_WEIGHTS,
} from "./quality-rules";
import type { ActionListItem } from "./types";

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
});
