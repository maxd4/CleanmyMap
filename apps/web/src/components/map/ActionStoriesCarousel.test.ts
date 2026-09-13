import { describe, expect, it } from "vitest";
import type { ActionMapItem } from "@/lib/actions/types";
import { mapItemType } from "@/lib/actions/data-contract";
import { selectRecentActions } from "@/app/(app)/actions/map/page-client";

function mapItem(
  id: string,
  recordType: ActionMapItem["record_type"],
): ActionMapItem {
  return {
    id,
    action_date: "2026-08-24",
    location_label: id,
    latitude: 48.85,
    longitude: 2.35,
    waste_kg: null,
    cigarette_butts: null,
    status: "approved",
    created_by_clerk_id: null,
    record_type: recordType,
  };
}

describe("ActionStoriesCarousel input", () => {
  it("keeps only actions while preserving all map items upstream", () => {
    const items = [
      ...Array.from({ length: 5 }, (_, index) => mapItem(`action-${index}`, "action")),
      ...Array.from({ length: 3 }, (_, index) => mapItem(`spot-${index}`, "other")),
      ...Array.from({ length: 2 }, (_, index) => mapItem(`clean-${index}`, "clean_place")),
    ];

    const recentActions = selectRecentActions(items);

    expect(items).toHaveLength(10);
    expect(recentActions).toHaveLength(5);
    expect(recentActions.every((item) => mapItemType(item) === "action")).toBe(true);
  });

  it("returns no carousel actions when only spots and clean places exist", () => {
    const items = [
      mapItem("spot-1", "other"),
      mapItem("clean-1", "clean_place"),
    ];

    expect(selectRecentActions(items)).toEqual([]);
    expect(items.map(mapItemType)).toEqual(["spot", "clean_place"]);
  });

  it("derives the carousel count from the actual action items", () => {
    const items = [
      mapItem("action-1", "action"),
      mapItem("spot-1", "other"),
      mapItem("action-2", "action"),
    ];

    expect(selectRecentActions(items)).toHaveLength(
      items.filter((item) => mapItemType(item) === "action").length,
    );
  });

  it("does not deduplicate action items", () => {
    const items = [mapItem("same-id", "action"), mapItem("same-id", "action")];

    expect(selectRecentActions(items)).toHaveLength(2);
  });
});
