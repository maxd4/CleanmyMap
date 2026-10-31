import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionRow } from "@/types/database";
import { publicAction } from "@/fixtures/public-action";

const fetchActionsMock = vi.hoisted(() => vi.fn());

vi.mock("./store", () => ({ fetchActions: fetchActionsMock }));

import { loadPublicActionRecommendations } from "./public-action-recommendations.server";

const now = new Date("2026-10-31T09:00:00.000Z");

function row(overrides: Partial<ActionRow>): ActionRow {
  return {
    ...publicAction,
    department_code: "75",
    department_name: "Paris",
    ...overrides,
  } as ActionRow;
}

function futureCandidate(id: string, overrides: Partial<ActionRow> = {}): ActionRow {
  return row({
    id,
    action_date: "2026-11-03",
    event_start_time: "10:00",
    location_label: "11e arrondissement",
    action_phase: "pre_action",
    status: "approved",
    published_at: "2026-10-01T10:00:00.000Z",
    moderation_visibility: "visible",
    review_state: "approved",
    access_mode: "public",
    ...overrides,
  });
}

describe("loadPublicActionRecommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the territorial scope without a global limit before selecting the first three dates", async () => {
    const candidates = Array.from({ length: 61 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 10, 1 + index)).toISOString().slice(0, 10);
      return futureCandidate(`same-${index.toString().padStart(2, "0")}`, { action_date: date });
    });
    fetchActionsMock.mockResolvedValue([...candidates].reverse());

    const recommendations = await loadPublicActionRecommendations(
      {} as never,
      row({
        id: "source",
        action_date: "2026-10-01",
        action_phase: "post_action_complete",
        location_label: "11e arrondissement",
      }),
      now,
    );

    expect(recommendations.map((item) => item.id)).toEqual(["same-00", "same-01", "same-02"]);
    expect(fetchActionsMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        limit: null,
        locationLabels: expect.arrayContaining(["11e arrondissement"]),
        status: "approved",
        includeFuturePublicActions: true,
        futureOnly: true,
      }),
    );
  });

  it("keeps the exact territory ahead of closer neighbors and excludes non-public candidates", async () => {
    fetchActionsMock.mockResolvedValue([
      futureCandidate("neighbor-early", { location_label: "12e arrondissement", action_date: "2026-11-01" }),
      futureCandidate("same-late", { action_date: "2026-11-02" }),
      futureCandidate("private", { access_mode: "invite_link" }),
      futureCandidate("hidden", { moderation_visibility: "hidden" }),
      futureCandidate("unpublished", { published_at: null }),
      futureCandidate("outside", { location_label: "Berges de Seine", department_code: null, department_name: null }),
    ]);

    const recommendations = await loadPublicActionRecommendations(
      {} as never,
      row({ id: "source", action_date: "2026-10-01", action_phase: "post_action_complete", location_label: "11e arrondissement" }),
      now,
    );

    expect(recommendations.map((item) => item.id)).toEqual(["same-late", "neighbor-early"]);
  });

  it("applies time and id tie-breakers without duplicate recommendations", async () => {
    const tied = futureCandidate("same-b", { action_date: "2026-11-01", event_start_time: "11:00" });
    fetchActionsMock.mockResolvedValue([
      tied,
      futureCandidate("same-a", { action_date: "2026-11-01", event_start_time: "11:00" }),
      futureCandidate("same-early", { action_date: "2026-11-01", event_start_time: "10:00" }),
      tied,
    ]);

    const recommendations = await loadPublicActionRecommendations(
      {} as never,
      row({ id: "source", action_date: "2026-10-01", action_phase: "post_action_complete", location_label: "11e arrondissement" }),
      now,
    );

    expect(recommendations.map((item) => item.id)).toEqual(["same-early", "same-a", "same-b"]);
  });
});
