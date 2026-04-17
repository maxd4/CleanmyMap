import { describe, expect, it } from "vitest";
import type { ActionListItem } from "@/lib/actions/types";
import type { CommunityEventItem } from "@/lib/community/http";
import {
  buildPartnerCards,
  computeEventConversions,
  computeEventRelances,
  computeEventStaffingPlan,
  computeQualityLeaderboard,
} from "./engagement";

function makeAction(partial: Partial<ActionListItem>): ActionListItem {
  return {
    id: partial.id ?? "a-1",
    created_at: partial.created_at ?? "2026-04-01T10:00:00.000Z",
    actor_name: partial.actor_name ?? "Alice",
    action_date: partial.action_date ?? "2026-04-01",
    location_label: partial.location_label ?? "Paris 10e",
    latitude: partial.latitude ?? 48.87,
    longitude: partial.longitude ?? 2.36,
    waste_kg: partial.waste_kg ?? 10,
    cigarette_butts: partial.cigarette_butts ?? 100,
    volunteers_count: partial.volunteers_count ?? 3,
    duration_minutes: partial.duration_minutes ?? 60,
    notes: partial.notes ?? null,
    status: partial.status ?? "approved",
    ...partial,
  };
}

function makeEvent(partial: Partial<CommunityEventItem>): CommunityEventItem {
  return {
    id: partial.id ?? "ev-1",
    createdAt: partial.createdAt ?? "2026-03-20T09:00:00.000Z",
    organizerClerkId: partial.organizerClerkId ?? "org-1",
    title: partial.title ?? "Collecte Test",
    eventDate: partial.eventDate ?? "2026-04-05",
    locationLabel: partial.locationLabel ?? "Paris 10e",
    description: partial.description ?? "Description",
    capacityTarget: partial.capacityTarget ?? 20,
    attendanceCount: partial.attendanceCount ?? 10,
    postMortem: partial.postMortem ?? null,
    rsvpCounts: partial.rsvpCounts ?? { yes: 12, maybe: 3, no: 1, total: 16 },
    myRsvpStatus: partial.myRsvpStatus ?? null,
  };
}

describe("computeEventConversions", () => {
  it("computes RSVP -> presence -> action funnel", () => {
    const events = [
      makeEvent({
        id: "event-001",
        rsvpCounts: { yes: 10, maybe: 2, no: 1, total: 13 },
        attendanceCount: 8,
      }),
    ];
    const actions = [
      makeAction({ id: "a-1", notes: "Cleanup [EVENT_REF]event-001" }),
      makeAction({ id: "a-2", notes: "[EVENT_REF]event-001" }),
    ];

    const result = computeEventConversions(events, actions);
    expect(result.rows[0]?.linkedActions).toBe(2);
    expect(result.rows[0]?.rsvpToAttendanceRate).toBe(80);
    expect(result.summary.rsvpToActionRate).toBe(20);
  });
});

describe("computeEventRelances", () => {
  it("prioritizes reminders for near events with low fill", () => {
    const reminders = computeEventRelances(
      [
        makeEvent({
          id: "ev-low",
          eventDate: "2026-04-12",
          capacityTarget: 30,
          rsvpCounts: { yes: 5, maybe: 6, no: 0, total: 11 },
        }),
      ],
      new Date("2026-04-11T08:00:00.000Z"),
    );

    expect(reminders.length).toBe(1);
    expect(reminders[0]?.priority).toBe("haute");
  });
});

describe("computeEventStaffingPlan", () => {
  it("flags upcoming events with staffing gap", () => {
    const plan = computeEventStaffingPlan(
      [
        makeEvent({
          id: "ev-gap",
          eventDate: "2026-04-13",
          capacityTarget: 40,
          rsvpCounts: { yes: 6, maybe: 10, no: 0, total: 16 },
        }),
      ],
      new Date("2026-04-11T08:00:00.000Z"),
    );

    expect(plan.rows.length).toBe(1);
    expect(plan.rows[0]?.riskLevel).toBe("rouge");
    expect(plan.rows[0]?.staffingGap).toBeGreaterThan(0);
    expect(plan.summary.atRiskCount).toBe(1);
  });
});

describe("computeQualityLeaderboard", () => {
  it("ranks contributors by quality-weighted score", () => {
    const leaderboard = computeQualityLeaderboard([
      makeAction({ id: "a1", actor_name: "Alice", notes: "ok" }),
      makeAction({ id: "a2", actor_name: "Alice", waste_kg: 8 }),
      makeAction({
        id: "a3",
        actor_name: "Bob",
        latitude: null,
        longitude: null,
      }),
    ]);

    expect(leaderboard[0]?.actor).toBe("Alice");
    expect(leaderboard[0]?.avgQuality).toBeGreaterThanOrEqual(
      leaderboard[1]?.avgQuality ?? 0,
    );
  });
});

describe("buildPartnerCards", () => {
  it("builds actionable partner cards", () => {
    const cards = buildPartnerCards([
      makeAction({
        id: "a1",
        actor_name: "Association X",
        location_label: "Paris 10e",
      }),
      makeAction({
        id: "a2",
        actor_name: "Association X",
        location_label: "Paris 10e",
      }),
      makeAction({
        id: "a3",
        actor_name: "Collectif Y",
        location_label: "Paris 11e",
      }),
    ]);

    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0]?.role).toBeTruthy();
    expect(cards[0]?.zone).toBeTruthy();
    expect(cards[0]?.contact).toContain("Canal");
    expect(cards[0]?.capacity).toBeTruthy();
  });
});
