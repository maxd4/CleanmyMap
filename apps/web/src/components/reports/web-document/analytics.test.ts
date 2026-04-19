import { describe, expect, it } from "vitest";
import type { ActionListItem, ActionMapItem } from "@/lib/actions/types";
import type { CommunityEventItem } from "@/lib/community/http";
import {
  buildMonthRows,
  buildRouteSteps,
  computeReportModel,
  getWeatherAdvice,
} from "./analytics";

function makeListItem(overrides: Partial<ActionListItem> = {}): ActionListItem {
  return {
    id: "a-1",
    status: "approved",
    action_date: "2026-03-02",
    waste_kg: 10,
    cigarette_butts: 200,
    volunteers_count: 4,
    duration_minutes: 60,
    location_label: "Paris 10e",
    record_type: "action",
    actor_name: "Alice",
    source: "web_form",
    created_at: "2026-03-01T08:00:00.000Z",
    association_name: "Assoc",
    notes: null,
    website_url: null,
    contract: {
      id: "a-1",
      type: "action",
      status: "approved",
      source: "web_form",
      location: { label: "Paris 10e", latitude: 48.87, longitude: 2.36 },
      geometry: { kind: "point", coordinates: [[48.87, 2.36]], geojson: null },
      dates: {
        observedAt: "2026-03-02",
        createdAt: "2026-03-01T08:00:00.000Z",
        importedAt: null,
        validatedAt: "2026-03-03T10:00:00.000Z",
      },
      metadata: {
        actorName: "Alice",
        associationName: "Assoc",
        notes: null,
        notesPlain: null,
        submissionMode: null,
        wasteBreakdown: null,
        wasteKg: 10,
        cigaretteButts: 200,
        volunteersCount: 4,
        durationMinutes: 60,
        manualDrawing: null,
      },
    },
    ...overrides,
  } as unknown as ActionListItem;
}

function makeMapItem(
  overrides: Partial<ActionMapItem> = {},
  location: { latitude: number; longitude: number; label?: string } = {
    latitude: 48.87,
    longitude: 2.36,
    label: "Paris 10e",
  },
): ActionMapItem {
  return {
    id: "m-1",
    status: "approved",
    location_label: location.label ?? "Paris 10e",
    waste_kg: 10,
    cigarette_butts: 200,
    contract: {
      id: "m-1",
      type: "action",
      status: "approved",
      source: "web_form",
      location: {
        label: location.label ?? "Paris 10e",
        latitude: location.latitude,
        longitude: location.longitude,
      },
      geometry: {
        kind: "point",
        coordinates: [[location.latitude, location.longitude]],
        geojson: null,
      },
      dates: {
        observedAt: "2026-03-02",
        createdAt: "2026-03-01T08:00:00.000Z",
        importedAt: null,
        validatedAt: "2026-03-03T10:00:00.000Z",
      },
      metadata: {
        actorName: "Alice",
        associationName: "Assoc",
        notes: null,
        notesPlain: null,
        submissionMode: null,
        wasteBreakdown: null,
        wasteKg: 10,
        cigaretteButts: 200,
        volunteersCount: 4,
        durationMinutes: 60,
        manualDrawing: null,
      },
    },
    ...overrides,
  } as unknown as ActionMapItem;
}

function makeEvent(overrides: Partial<CommunityEventItem> = {}): CommunityEventItem {
  return {
    id: "e-1",
    createdAt: "2026-03-01T08:00:00.000Z",
    organizerClerkId: "org_1",
    title: "Nettoyage canal",
    eventDate: "2026-03-20",
    locationLabel: "Canal",
    description: null,
    capacityTarget: 20,
    attendanceCount: 12,
    postMortem: "ok",
    rsvpCounts: { yes: 10, maybe: 2, no: 1, total: 13 },
    myRsvpStatus: null,
    ...overrides,
  };
}

describe("reports web analytics", () => {
  it("groups monthly rows by month key", () => {
    const rows = buildMonthRows([
      makeListItem({ id: "a-1", action_date: "2026-01-05", waste_kg: 2 }),
      makeListItem({ id: "a-2", action_date: "2026-01-18", waste_kg: 3 }),
      makeListItem({ id: "a-3", action_date: "2026-02-02", waste_kg: 4 }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.kg).toBe(5);
    expect(rows[1]?.kg).toBe(4);
  });

  it("builds route steps with positive segment distances", () => {
    const steps = buildRouteSteps(
      [
        makeMapItem({ id: "m-1" }, { label: "A", latitude: 48.85, longitude: 2.35 }),
        makeMapItem({ id: "m-2" }, { label: "B", latitude: 48.86, longitude: 2.36 }),
      ],
      6,
    );
    expect(steps).toHaveLength(2);
    expect(steps[0]?.segmentKm).toBe(0);
    expect(steps[1]?.segmentKm).toBeGreaterThan(0);
  });

  it("computes model summary and community buckets", () => {
    const report = computeReportModel({
      allItems: [
        makeListItem({ id: "all-1", status: "approved", source: "web_form" }),
        makeListItem({ id: "all-2", status: "pending", source: "community_app" }),
        makeListItem({ id: "all-3", status: "rejected", source: "admin_import" }),
      ],
      approvedItems: [makeListItem({ id: "approved-1", status: "approved" })],
      mapItems: [makeMapItem({ id: "map-1" })],
      events: [makeEvent()],
      now: new Date("2026-03-25T12:00:00.000Z"),
    });
    expect(report.totals.actions).toBe(1);
    expect(report.moderation.pending).toBe(1);
    expect(report.moderation.rejected).toBe(1);
    expect(report.community.sourceBuckets.citoyen).toBe(1);
    expect(report.community.sourceBuckets.associatif).toBe(1);
    expect(report.community.sourceBuckets.institutionnel).toBe(1);
    expect(report.impactMethodology.formulas).toHaveLength(4);
    expect(report.impactMethodology.proxyVersion.length).toBeGreaterThan(0);
  });

  it("returns weather advice by risk thresholds", () => {
    expect(getWeatherAdvice({ temperature: 20, rain: 4, wind: 10 })).toContain("prudent");
    expect(getWeatherAdvice({ temperature: 30, rain: 0, wind: 10 })).toContain("chaud");
    expect(getWeatherAdvice({ temperature: 1, rain: 0, wind: 10 })).toContain("froid");
  });
});
