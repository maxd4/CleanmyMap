import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionRow } from "@/types/database";
import type { ActionUpdateInput } from "./action-update-audit";
import { parseDrawingFromNotes } from "./geometry/drawing";
import type { RouteDistancePolicy } from "./route-target-distance";
import { rebaseRouteTargetDistancePolicy } from "./route-target-policy-rebase";
import { polylineDistanceKm } from "@/lib/geo/geodesic-distance";

const resolveActionDepartmentForPersistenceMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/geo/action-department-resolver", () => ({
  resolveActionDepartmentForPersistence: resolveActionDepartmentForPersistenceMock,
}));

import { prepareActionUpdate } from "./action-update-persistence";

const gpxCoordinates: [number, number][] = [
  [48.85, 2.35],
  [48.86, 2.36],
  [48.85, 2.35],
];

const gpxImport = {
  source: "gpx_import" as const,
  observedDistanceKm: 1.572,
  pointCount: gpxCoordinates.length,
  inferredTopology: "loop" as const,
  fileName: "terrain.gpx",
};

function buildGpxNotes(): string {
  return [
    "Note conservée",
    `[DRAWING_GEOJSON]${JSON.stringify({
      kind: "polyline",
      coordinates: gpxCoordinates,
    })}`,
  ].join("\n");
}

function buildCurrent(): ActionRow {
  return {
    id: "action-gpx-policy",
    created_at: "2026-09-16T09:00:00.000Z",
    updated_at: "2026-09-16T09:00:00.000Z",
    created_by_clerk_id: "creator-1",
    actor_name: "Test",
    organizer_type: null,
    action_date: "2026-09-20",
    location_label: "Paris",
    department_code: null,
    department_name: null,
    latitude: 48.85,
    longitude: 2.35,
    derived_geometry_kind: "polyline",
    derived_geometry_geojson: null,
    geometry_confidence: 1,
    geometry_source: "gpx_import",
    waste_kg: null,
    cigarette_butts: null,
    volunteers_count: 1,
    duration_minutes: 60,
    event_start_time: "09:00:00",
    event_end_time: "10:00:00",
    notes: buildGpxNotes(),
    status: "pending",
    published_at: null,
    action_phase: "pre_action",
    preparation_data: {
      routeTargetDistanceKm: 1,
      routeTargetDistanceSource: "derived",
      routeTargetDistancePolicyVersion: "route-distance-v1",
      routeObservedDistanceKm: gpxImport.observedDistanceKm,
      gpxImport,
    },
  };
}

describe("GPX policy invariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
  });

  it("rebases only the derived target and preserves the observed GPX measurement", () => {
    const policy: RouteDistancePolicy = {
      version: "route-distance-v2",
      kilometersPerHour: 2,
    };
    const preparationData = buildCurrent().preparation_data;

    const rebased = rebaseRouteTargetDistancePolicy({
      preparationData,
      durationMinutes: 90,
      policy,
    });

    expect(rebased).toMatchObject({
      routeTargetDistanceKm: 3,
      routeTargetDistanceSource: "derived",
      routeTargetDistancePolicyVersion: "route-distance-v2",
      routeObservedDistanceKm: gpxImport.observedDistanceKm,
      gpxImport,
    });
    expect(rebased.gpxImport).toEqual(preparationData.gpxImport);
  });

  it("keeps the GPX geometry and observed distance during a policy-shaped update", async () => {
    const current = buildCurrent();
    const prepared = await prepareActionUpdate({
      current,
      parsedBody: ({
        durationMinutes: 90,
        eventEndTime: "11:00",
        notes: "Note modifiée",
      } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.preparation_data).toMatchObject({
      routeTargetDistanceKm: 1.5,
      routeTargetDistanceSource: "derived",
      routeTargetDistancePolicyVersion: "route-distance-v1",
      routeObservedDistanceKm: gpxImport.observedDistanceKm,
      gpxImport,
    });
    expect(parseDrawingFromNotes(String(prepared.updateData.notes)).manualDrawing).toEqual({
      kind: "polyline",
      coordinates: gpxCoordinates,
    });
    expect(prepared.updateData).not.toHaveProperty("derived_geometry_geojson");
    expect(prepared.updateData).not.toHaveProperty("geometry_source");
  });

  it("replaces a reconstructed action with the submitted GPX in one update payload", async () => {
    const canonicalObservedDistanceKm = Number(
      polylineDistanceKm(gpxCoordinates).toFixed(3),
    );
    const current = {
      ...buildCurrent(),
      geometry_source: "routed" as const,
      geometry_confidence: 0.78,
      derived_geometry_geojson:
        '{"type":"LineString","coordinates":[[2.35,48.85],[2.36,48.86]]}',
      preparation_data: {
        routeTargetDistanceKm: 2.5,
        routeTargetDistanceSource: "manual" as const,
        routeNetworkDistanceKm: 2.1,
        routeGeometryMode: "network" as const,
        routeGeometryProvider: "osrm" as const,
      },
    };
    const prepared = await prepareActionUpdate({
      current,
      parsedBody: ({
        geometrySource: "gpx_import",
        manualDrawing: { kind: "polyline", coordinates: gpxCoordinates },
        preparationData: {
          routeTargetDistanceKm: 2.5,
          routeTargetDistanceSource: "manual",
          gpxImport,
        },
        notes: "Nouvelle trace terrain",
      } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData).toMatchObject({
      derived_geometry_kind: "polyline",
      geometry_source: "gpx_import",
      geometry_confidence: 1,
      preparation_data: {
        routeTargetDistanceKm: 2.5,
        routeTargetDistanceSource: "manual",
        routeObservedDistanceKm: canonicalObservedDistanceKm,
        gpxImport: {
          ...gpxImport,
          observedDistanceKm: canonicalObservedDistanceKm,
        },
      },
    });
    expect(prepared.updateData.preparation_data).not.toHaveProperty(
      "routeNetworkDistanceKm",
    );
    expect(prepared.updateData.derived_geometry_geojson).toBe(
      JSON.stringify({
        type: "LineString",
        coordinates: gpxCoordinates.map(([latitude, longitude]) => [longitude, latitude]),
      }),
    );
    expect(parseDrawingFromNotes(String(prepared.updateData.notes)).manualDrawing).toEqual({
      kind: "polyline",
      coordinates: gpxCoordinates,
    });
  });

  it("keeps a GPS tracking observation ahead of a later route-shaped update", async () => {
    const current = {
      ...buildCurrent(),
      geometry_source: "gps_tracking" as const,
      preparation_data: {
        routeTargetDistanceKm: 2.5,
        routeTargetDistanceSource: "derived" as const,
        routeObservedDistanceKm: 2.345,
      },
    };

    const prepared = await prepareActionUpdate({
      current,
      parsedBody: ({
        durationMinutes: 90,
        eventEndTime: "10:30",
        preparationData: {
          routeNetworkDistanceKm: 4,
          routeGeometryMode: "network",
          routeGeometryProvider: "osrm",
        },
      } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.preparation_data).toMatchObject({
      routeTargetDistanceKm: 1.5,
      routeTargetDistanceSource: "derived",
      routeObservedDistanceKm: 2.345,
    });
    expect(prepared.updateData).not.toHaveProperty("geometry_source");
  });
});
