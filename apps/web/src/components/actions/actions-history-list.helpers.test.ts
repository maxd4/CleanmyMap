import { describe, expect, it } from "vitest";
import type { ActionListItem } from "@/lib/actions/types";
import {
  buildJoinHref,
  canManageGroupJoin,
  formatDate,
  formatRecordType,
  isJoinableAction,
  qualityTone,
  rowTone,
} from "./actions-history-list.helpers";

function createAction(overrides: Partial<ActionListItem> = {}): ActionListItem {
  return {
    id: "action-1",
    created_at: "2026-06-01T10:00:00Z",
    action_date: "2026-06-10",
    location_label: "Parc Nord",
    volunteers_count: 12,
    duration_minutes: 45,
    status: "approved",
    record_type: "action",
    actor_name: "Aline",
    created_by_clerk_id: "user-1",
    contract: {
      metadata: {
        groupJoinEnabled: true,
      },
    } as ActionListItem["contract"],
    ...overrides,
  };
}

describe("actions history helpers", () => {
  it("formats join links and record labels", () => {
    expect(buildJoinHref("action 1")).toBe(
      "/sections/rejoindre-un-formulaire?actionId=action%201",
    );
    expect(formatRecordType(createAction({ record_type: "clean_place" }))).toBe("lieu propre");
    expect(formatRecordType(createAction({ record_type: "other" }))).toBe("spot");
  });

  it("formats dates in french and leaves invalid values intact", () => {
    expect(formatDate("2026-06-10T10:00:00Z", "fr")).toContain("2026");
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  it("keeps group join visibility tied to ownership and status", () => {
    expect(isJoinableAction(createAction())).toBe(true);
    expect(
      canManageGroupJoin(createAction(), "user-1", false),
    ).toBe(true);
    expect(
      canManageGroupJoin(createAction({ status: "pending" }), "user-1", true),
    ).toBe(false);
  });

  it("returns the expected tone classes", () => {
    expect(qualityTone("A")).toContain("emerald");
    expect(rowTone("C")).toContain("rose");
  });
});
