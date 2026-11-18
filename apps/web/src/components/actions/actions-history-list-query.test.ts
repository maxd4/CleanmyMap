import { describe, expect, it } from "vitest";
import type { ActionListItem } from "@/lib/actions/types";
import {
  buildActionHistoryQualityMap,
  selectActionHistoryItem,
  sortActionHistoryItems,
} from "./actions-history-list-query";

function createItem(id: string, overrides: Partial<ActionListItem> = {}): ActionListItem {
  return {
    id,
    created_at: "2026-06-01T10:00:00Z",
    action_date: "2026-06-10",
    location_label: "Parc",
    latitude: null,
    longitude: null,
    waste_kg: 5,
    cigarette_butts: 10,
    volunteers_count: 2,
    duration_minutes: 30,
    notes: null,
    status: "approved",
    record_type: "action",
    actor_name: "Aline",
    created_by_clerk_id: "u1",
    quality_score: 80,
    quality_grade: "A",
    ...overrides,
  };
}

describe("actions-history-list-query", () => {
  it("requires explicit selection and returns null when selectedId is null or missing", () => {
    const items = [createItem("a1"), createItem("a2")];
    expect(selectActionHistoryItem(items, null)).toBeNull();
    expect(selectActionHistoryItem(items, "missing")).toBeNull();
    expect(selectActionHistoryItem(items, "a2")?.id).toBe("a2");
  });

  it("sorts locally by date, quality and waste without mutating the source array", () => {
    const items = [
      createItem("a1", { action_date: "2026-06-15", quality_score: 70, quality_grade: "B", waste_kg: 12 }),
      createItem("a2", { action_date: "2026-06-01", quality_score: 95, quality_grade: "A", waste_kg: 3 }),
    ];
    const qualityMap = buildActionHistoryQualityMap(items);

    expect(sortActionHistoryItems(items, qualityMap, "date_asc").map((i) => i.id)).toEqual(["a2", "a1"]);
    expect(sortActionHistoryItems(items, qualityMap, "quality_desc").map((i) => i.id)).toEqual(["a2", "a1"]);
    expect(sortActionHistoryItems(items, qualityMap, "quality_asc").map((i) => i.id)).toEqual(["a1", "a2"]);
    expect(sortActionHistoryItems(items, qualityMap, "waste_desc").map((i) => i.id)).toEqual(["a1", "a2"]);
  });
});
