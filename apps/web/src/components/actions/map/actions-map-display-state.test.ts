import { describe, expect, it } from "vitest";
import { buildActionDataContract, toActionMapItem } from "@/lib/actions/data-contract";
import {
  resolveMapPlaceStateForItem,
  resolveMapPlaceStateViews,
} from "./actions-map-display-state";

function buildItem(id: string, day: number) {
  return toActionMapItem(
    buildActionDataContract({
      id,
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: new Date(Date.UTC(2026, 0, 1 + day)).toISOString(),
      locationLabel: "Parc test",
      latitude: 48.8566,
      longitude: 2.3522,
      wasteKg: 0,
      cigaretteButts: 0,
      volunteersCount: 1,
      durationMinutes: 10,
      actionPhase: "post_action_complete",
    }),
    undefined,
    undefined,
  );
}

describe("actions map display state", () => {
  it("keeps mode selection deterministic and maps both views to the source item", () => {
    const item = buildItem("action-1", 0);
    const views = resolveMapPlaceStateViews([item], {
      asOf: new Date(Date.UTC(2026, 0, 31)),
      sourceCompleteness: "complete",
      historicalScoreResolver: () => 70,
    });

    const observed = resolveMapPlaceStateForItem(views, item, "observed");
    const projected = resolveMapPlaceStateForItem(views, item, "projected_today");

    expect(observed?.source).toBe("observed");
    expect(projected?.source).toBe("projected");
    expect(resolveMapPlaceStateViews([item], {
      asOf: new Date(Date.UTC(2026, 0, 31)),
      sourceCompleteness: "complete",
      historicalScoreResolver: () => 70,
    })).toEqual(views);
  });
});
