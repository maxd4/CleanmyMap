import { describe, expect, it } from "vitest";
import { makeJoinableActionItem } from "@/__tests__/support/joinable-action-test-helpers";
import { filterAndSortJoinableActions } from "./rejoindre-un-formulaire-section.utils";

const makeAction = makeJoinableActionItem;

describe("filterAndSortJoinableActions", () => {
  it("filters by joined state and search text", () => {
    const items = [
      makeAction({
        id: "action-1",
        action_date: "2026-05-12",
        location_label: "Parc Nord",
        joined: false,
      }),
      makeAction({
        id: "action-2",
        action_date: "2026-05-13",
        location_label: "Quai Est",
        joined: true,
      }),
    ];

    const filtered = filterAndSortJoinableActions(items, {
      search: "quai",
      joinFilter: "joined",
      sort: "soonest",
      focusActionId: null,
      locale: "fr",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("action-2");
  });

  it("excludes pending requests from available results", () => {
    const items = [
      makeAction({
        id: "action-1",
        action_date: "2026-05-12",
        location_label: "Parc Nord",
        awaitingApproval: true,
      }),
      makeAction({
        id: "action-2",
        action_date: "2026-05-13",
        location_label: "Quai Est",
        joined: false,
      }),
    ];

    const filtered = filterAndSortJoinableActions(items, {
      search: "",
      joinFilter: "available",
      sort: "soonest",
      focusActionId: null,
      locale: "fr",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("action-2");
  });

  it("sorts by participants and keeps the focused action first", () => {
    const items = [
      makeAction({
        id: "action-1",
        action_date: "2026-05-12",
        location_label: "Parc Nord",
        participantsCount: 5,
      }),
      makeAction({
        id: "action-2",
        action_date: "2026-05-11",
        location_label: "Quai Est",
        participantsCount: 12,
      }),
      makeAction({
        id: "action-3",
        action_date: "2026-05-10",
        location_label: "Place Sud",
        participantsCount: 1,
      }),
    ];

    const filtered = filterAndSortJoinableActions(items, {
      search: "",
      joinFilter: "all",
      sort: "participants-desc",
      focusActionId: "action-3",
      locale: "fr",
    });

    expect(filtered.map((item) => item.id)).toEqual(["action-3", "action-2", "action-1"]);
  });

  it("keeps future actions in chronological order regardless of participation status", () => {
    const items = [
      makeAction({
        id: "later",
        action_date: "2026-09-20",
        location_label: "Place B",
        joined: true,
      }),
      makeAction({
        id: "soon",
        action_date: "2026-09-15",
        location_label: "Place A",
      }),
    ];

    const filtered = filterAndSortJoinableActions(items, {
      search: "",
      joinFilter: "all",
      sort: "soonest",
      focusActionId: null,
      locale: "fr",
    });

    expect(filtered.map((item) => item.id)).toEqual(["soon", "later"]);
  });
});
