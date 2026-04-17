import { describe, expect, it } from "vitest";
import type { ActionListItem, ActionMapItem } from "../actions/types";
import {
  computeBusinessAlerts,
  computeCampaignGoalsByZone,
  computeNeighborhoodCampaignPlan,
} from "./business-alerts";

function makeAction(partial: Partial<ActionListItem>): ActionListItem {
  return {
    id: partial.id ?? "a1",
    created_at: partial.created_at ?? "2026-04-01T10:00:00.000Z",
    actor_name: partial.actor_name ?? "Alice",
    action_date: partial.action_date ?? "2026-04-01",
    location_label: partial.location_label ?? "Paris 10e",
    latitude: partial.latitude ?? 48.87,
    longitude: partial.longitude ?? 2.36,
    waste_kg: partial.waste_kg ?? 12,
    cigarette_butts: partial.cigarette_butts ?? 120,
    volunteers_count: partial.volunteers_count ?? 3,
    duration_minutes: partial.duration_minutes ?? 60,
    notes: partial.notes ?? null,
    status: partial.status ?? "approved",
    ...partial,
  };
}

function makeMapItem(partial: Partial<ActionMapItem>): ActionMapItem {
  return {
    id: partial.id ?? "m1",
    action_date: partial.action_date ?? "2026-04-01",
    location_label: partial.location_label ?? "Paris 10e",
    latitude: partial.latitude ?? 48.87,
    longitude: partial.longitude ?? 2.36,
    waste_kg: partial.waste_kg ?? 10,
    cigarette_butts: partial.cigarette_butts ?? 60,
    status: partial.status ?? "approved",
    ...partial,
  };
}

describe("computeBusinessAlerts", () => {
  it("returns moderation backlog and zone critical alerts", () => {
    const alerts = computeBusinessAlerts({
      actions: [
        makeAction({
          id: "p1",
          status: "pending",
          created_at: "2026-03-20T10:00:00.000Z",
        }),
        makeAction({
          id: "p2",
          status: "pending",
          created_at: "2026-03-18T10:00:00.000Z",
        }),
        makeAction({ id: "ok1", status: "approved" }),
      ],
      mapItems: [
        makeMapItem({ id: "z1", location_label: "Paris 10e", waste_kg: 50 }),
        makeMapItem({ id: "z2", location_label: "Paris 10e", waste_kg: 40 }),
        makeMapItem({ id: "z3", location_label: "Paris 10e", waste_kg: 35 }),
      ],
    });

    expect(alerts.some((alert) => alert.id === "moderation-backlog")).toBe(
      true,
    );
    expect(alerts.some((alert) => alert.id.startsWith("critical-zone-"))).toBe(
      true,
    );
  });
});

describe("computeCampaignGoalsByZone", () => {
  it("builds campaign objectives by area", () => {
    const goals = computeCampaignGoalsByZone({
      now: new Date("2026-04-11T10:00:00.000Z"),
      actions: [
        makeAction({
          id: "a1",
          action_date: "2026-04-08",
          location_label: "Paris 10e",
          waste_kg: 20,
          volunteers_count: 4,
        }),
        makeAction({
          id: "a2",
          action_date: "2026-04-02",
          location_label: "Paris 10e",
          waste_kg: 14,
          volunteers_count: 3,
        }),
        makeAction({
          id: "a3",
          action_date: "2026-03-27",
          location_label: "Paris 11e",
          waste_kg: 8,
          volunteers_count: 2,
        }),
      ],
    });

    expect(goals.length).toBeGreaterThan(0);
    expect(goals[0]?.targetActions30d).toBeGreaterThanOrEqual(2);
    expect(goals[0]?.targetKg30d).toBeGreaterThan(0);
  });
});

describe("computeNeighborhoodCampaignPlan", () => {
  it("derives cadence, staffing and checkpoints from campaign goals", () => {
    const plans = computeNeighborhoodCampaignPlan({
      now: new Date("2026-04-11T10:00:00.000Z"),
      actions: [
        makeAction({
          id: "p1",
          action_date: "2026-04-09",
          location_label: "Paris 10e",
          waste_kg: 25,
          volunteers_count: 5,
        }),
        makeAction({
          id: "p2",
          action_date: "2026-04-04",
          location_label: "Paris 10e",
          waste_kg: 18,
          volunteers_count: 4,
        }),
        makeAction({
          id: "p3",
          action_date: "2026-03-28",
          location_label: "Paris 11e",
          waste_kg: 9,
          volunteers_count: 2,
        }),
      ],
    });

    expect(plans.length).toBeGreaterThan(0);
    expect(plans[0]?.weeklyCadence).toBeGreaterThanOrEqual(1);
    expect(plans[0]?.staffingPerAction).toBeGreaterThanOrEqual(2);
    expect(plans[0]?.checkpoint7d).toBe("2026-04-18");
    expect(plans[0]?.checkpoint21d).toBe("2026-05-02");
  });
});
