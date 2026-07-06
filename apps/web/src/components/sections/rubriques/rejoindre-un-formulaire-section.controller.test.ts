import { afterEach, describe, expect, it, vi } from "vitest";
import type { JoinableActionItem } from "@/lib/actions/group-participation";
import { getLocationFilterBucket, isWithinPeriod, sortItemsByStatusRank } from "./rejoindre-un-formulaire-section.controller";

function makeItem(
  partial: Partial<JoinableActionItem> & Pick<JoinableActionItem, "id" | "action_date" | "location_label">,
): JoinableActionItem {
  return {
    ...partial,
    created_at: `${partial.action_date}T10:00:00Z`,
    volunteers_count: partial.volunteers_count ?? 12,
    duration_minutes: partial.duration_minutes ?? 30,
    status: partial.status ?? "approved",
    actionPhase: partial.actionPhase ?? "post_action_complete",
    participantsCount: partial.participantsCount ?? 0,
    joined: partial.joined ?? false,
    awaitingApproval: partial.awaitingApproval ?? false,
    joinedAt: partial.joinedAt ?? null,
    participationStatus: partial.participationStatus ?? null,
    participationSource: partial.participationSource ?? null,
    participationUpdatedAt: partial.participationUpdatedAt ?? null,
    groupJoinEnabled: partial.groupJoinEnabled ?? true,
    pendingRequestsCount: partial.pendingRequestsCount ?? 0,
  };
}

describe("getLocationFilterBucket", () => {
  it("classifies francilian locations", () => {
    expect(getLocationFilterBucket("Quai de Seine - Paris")).toBe("ile-de-france");
  });

  it("classifies other locations", () => {
    expect(getLocationFilterBucket("Lyon centre")).toBe("autres");
  });
});

describe("isWithinPeriod", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts actions inside the selected range", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T12:00:00Z"));

    expect(isWithinPeriod("2026-07-12", "seven-days")).toBe(true);
    expect(isWithinPeriod("2026-07-15", "seven-days")).toBe(false);
    expect(isWithinPeriod("2026-08-10", "thirty-days")).toBe(false);
  });

  it("keeps invalid dates visible", () => {
    expect(isWithinPeriod("not-a-date", "ninety-days")).toBe(true);
  });
});

describe("sortItemsByStatusRank", () => {
  it("orders open, pending, confirmed, then closed items", () => {
    const items = [
      makeItem({
        id: "closed",
        action_date: "2026-05-01",
        location_label: "Place Sud",
        joined: false,
        awaitingApproval: false,
        groupJoinEnabled: false,
      }),
      makeItem({
        id: "confirmed",
        action_date: "2026-05-02",
        location_label: "Place Est",
        joined: true,
      }),
      makeItem({
        id: "pending",
        action_date: "2026-05-03",
        location_label: "Place Nord",
        awaitingApproval: true,
      }),
      makeItem({
        id: "open",
        action_date: "2026-05-04",
        location_label: "Place Ouest",
      }),
    ];

    expect(sortItemsByStatusRank(items).map((item) => item.id)).toEqual([
      "open",
      "pending",
      "confirmed",
      "closed",
    ]);
  });
});
