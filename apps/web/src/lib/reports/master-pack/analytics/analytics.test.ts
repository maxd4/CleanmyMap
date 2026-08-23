import { describe, expect, it } from "vitest";
import type { ActionListItem, ActionMapItem } from "@/lib/actions/types";
import { computeReportModel } from "@/lib/reports/report-model";
import { computeCommunityMetrics } from "./community";
import { computeEnvironmentalProxies } from "./environmental";
import { computeTerrainMetrics } from "./terrain";

function makeItem(overrides: Partial<ActionListItem> = {}): ActionListItem {
  return {
    id: "item-1",
    created_at: "2026-03-01T08:00:00.000Z",
    actor_name: "Alice",
    action_date: "2026-03-02",
    location_label: "Paris 10e",
    latitude: 48.87,
    longitude: 2.36,
    waste_kg: 10,
    cigarette_butts: 200,
    volunteers_count: 4,
    duration_minutes: 60,
    notes: null,
    status: "approved",
    record_type: "action",
    source: "web_form",
    contract: {
      id: "item-1",
      type: "action",
      status: "approved",
      source: "web_form",
      location: { label: "Paris 10e", latitude: 48.87, longitude: 2.36 },
      geometry: {
        kind: "point",
        coordinates: [[48.87, 2.36]],
        geojson: null,
        confidence: 1,
        geometrySource: "fallback_point",
        origin: "fallback_point",
      },
      dates: {
        observedAt: "2026-03-02",
        createdAt: "2026-03-01T08:00:00.000Z",
        importedAt: null,
        validatedAt: "2026-03-03T10:00:00.000Z",
      },
      metadata: {
        actorName: "Alice",
        notes: null,
        notesPlain: null,
        groupJoinEnabled: null,
        wasteKg: 10,
        cigaretteButts: 200,
        volunteersCount: 4,
        durationMinutes: 60,
        manualDrawing: null,
      },
    },
    ...overrides,
  } as ActionListItem;
}

function makeMapItem(overrides: Partial<ActionMapItem> = {}): ActionMapItem {
  return { ...makeItem(), ...overrides } as ActionMapItem;
}

const actions = [
  makeItem({ id: "a-1", actor_name: "Alice", waste_kg: 10, cigarette_butts: 200 }),
  makeItem({ id: "a-2", actor_name: "Alice", waste_kg: 5, cigarette_butts: 50 }),
  makeItem({ id: "a-3", actor_name: "Bob", source: "community_app", waste_kg: 3, cigarette_butts: 20 }),
  makeItem({ id: "a-4", actor_name: "Admin", source: "admin_import", waste_kg: 8, cigarette_butts: 10 }),
];

const mapItems = [
  makeMapItem({ id: "point", latitude: 48.87, longitude: 2.36 }),
  makeMapItem({
    id: "line",
    contract: {
      ...makeItem().contract!,
      id: "line",
      geometry: {
        ...makeItem().contract!.geometry,
        kind: "polyline",
        coordinates: [[48.87, 2.36], [48.88, 2.37]],
        geometrySource: "manual",
        origin: "manual",
      },
    },
  }),
  makeMapItem({
    id: "manual-polygon",
    contract: undefined,
    manual_drawing: { kind: "polygon", coordinates: [[48.87, 2.36], [48.88, 2.37], [48.87, 2.38]] },
  }),
  makeMapItem({
    id: "point-without-contract",
    contract: undefined,
    manual_drawing: null,
    manual_drawing_geojson: null,
  }),
];

const events = [
  {
    id: "event-1",
    createdAt: "2026-03-01T08:00:00.000Z",
    organizerClerkId: "org-1",
    title: "Nettoyage",
    eventDate: "2026-03-20",
    locationLabel: "Canal",
    description: null,
    capacityTarget: 20,
    attendanceCount: 10,
    postMortem: null,
    cleanupObjective: null,
    cleanupZone: null,
    cleanupLogisticsNeeds: null,
    cleanupSupportLevel: null,
    cleanupWasteTypesExpected: [],
    rsvpCounts: { yes: 8, maybe: 2, no: 1, total: 11 },
    myRsvpStatus: null,
  },
];

describe("report-model/master-pack shared analytics", () => {
  it("keeps common terrain, community and environmental metrics identical", () => {
    const report = computeReportModel({
      allItems: actions,
      approvedItems: actions,
      mapItems,
      events,
      now: new Date("2026-03-25T12:00:00.000Z"),
    });
    const terrain = computeTerrainMetrics(mapItems);
    const community = computeCommunityMetrics(actions, events);
    const environmental = computeEnvironmentalProxies(report.totals.butts, report.totals.kg, 0);

    expect(terrain.coverage).toMatchObject({
      geolocatedCount: report.map.points,
      traceCount: report.map.traces,
      geoCoverage: report.map.geoCoverage,
      traceCoverage: report.map.traceCoverage,
    });
    expect(community.recognition.topLeaderboard).toEqual(report.community.topLeaderboard);
    expect(community.recognition.badgeConfirmed).toBe(report.community.badgeConfirmed);
    expect(community.recognition.badgeExpert).toBe(report.community.badgeExpert);
    expect(community.distribution.sourceBuckets).toEqual(report.community.sourceBuckets);
    expect(environmental.waterProtectedLiters).toBe(report.climate.waterProtectedLiters);
    expect(environmental.co2AvoidedKg).toBe(report.climate.co2AvoidedKg);
    expect(environmental.recyclableKg).toBe(report.recycling.recyclableKg);
    expect(environmental.triIndex).toBe(report.recycling.triIndex);
  });

  it("never counts a point without contract or manual drawing as a trace", () => {
    const pointWithoutTrace = makeMapItem({
      id: "point-only",
      contract: undefined,
      manual_drawing: null,
      manual_drawing_geojson: null,
    });
    const report = computeReportModel({
      allItems: [],
      approvedItems: [],
      mapItems: [pointWithoutTrace],
      events: [],
      now: new Date("2026-03-25T12:00:00.000Z"),
    });

    expect(report.map.traces).toBe(0);
    expect(computeTerrainMetrics([pointWithoutTrace]).coverage.traceCount).toBe(0);
  });

  it("keeps the web and master-pack presentation caps", () => {
    const manyActions = Array.from({ length: 11 }, (_, index) =>
      makeItem({ id: `leader-${index}`, actor_name: `Actor ${index}` }),
    );
    const report = computeReportModel({
      allItems: manyActions,
      approvedItems: manyActions,
      mapItems: [],
      events: [],
      now: new Date("2026-03-25T12:00:00.000Z"),
    });
    const community = computeCommunityMetrics(manyActions, []);

    expect(report.community.topLeaderboard).toHaveLength(8);
    expect(community.recognition.topLeaderboard).toHaveLength(10);

    const routeItems = Array.from({ length: 11 }, (_, index) =>
      makeMapItem({
        id: `route-${index}`,
        latitude: 48.8 + index / 1000,
        longitude: 2.3 + index / 1000,
      }),
    );
    const routeReport = computeReportModel({
      allItems: [],
      approvedItems: [],
      mapItems: routeItems,
      events: [],
      now: new Date("2026-03-25T12:00:00.000Z"),
    });
    const terrain = computeTerrainMetrics(routeItems);

    expect(routeReport.routeSteps).toHaveLength(6);
    expect(terrain.routing.steps).toHaveLength(10);
  });
});
