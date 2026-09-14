import { describe, expect, it } from "vitest";
import { mergePublishedActionItems } from "./use-chat-action-discussions";
import type { ActionListItem } from "@/lib/actions/types";

function item(id: string, date: string, publishedAt: string | null): ActionListItem {
  return {
    id, created_at: "2026-01-01T00:00:00Z", actor_name: "Alex", action_date: date,
    location_label: "Parc", latitude: null, longitude: null, waste_kg: null,
    cigarette_butts: null, volunteers_count: 4, duration_minutes: 45,
    notes: null, status: "approved", published_at: publishedAt,
  } as ActionListItem;
}

describe("chat action discussions", () => {
  it("deduplicates sources, excludes unpublished records and keeps future actions first", () => {
    const result = mergePublishedActionItems([
      [item("past", "2025-01-01", "2025-01-01T00:00:00Z"), item("private", "2099-01-01", null)],
      [item("future", "2099-01-01", "2026-01-01T00:00:00Z"), item("past", "2025-01-01", "2025-01-01T00:00:00Z")],
    ]);
    expect(result.map(({ id }) => id)).toEqual(["future", "past"]);
  });
});
