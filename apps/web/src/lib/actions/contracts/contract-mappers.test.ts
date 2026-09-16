import { describe, expect, it, vi } from "vitest";
import { toActionContract } from "@/lib/actions/unified-source/contracts";
import { buildActionInsertPayload } from "@/lib/actions/store";
import { buildActionEditorPayload } from "@/lib/actions/action-editor-payload";
import type { RouteDistancePolicy } from "@/lib/actions/route-target-distance";

vi.mock("server-only", () => ({}));

function buildRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "action-department",
    created_at: "2026-09-13T10:00:00.000Z",
    updated_at: "2026-09-13T10:00:00.000Z",
    created_by_clerk_id: "user-1",
    actor_name: "Déclarant",
    organizer_type: null,
    action_date: "2026-09-12",
    location_label: "Bastia",
    department_code: "2B",
    department_name: "Haute-Corse",
    latitude: 42.7,
    longitude: 9.45,
    derived_geometry_kind: null,
    derived_geometry_geojson: null,
    geometry_confidence: null,
    geometry_source: null,
    waste_kg: null,
    cigarette_butts: null,
    volunteers_count: 1,
    duration_minutes: 0,
    event_start_time: null,
    event_end_time: null,
    notes: null,
    status: "approved" as const,
    action_phase: "post_action_complete" as const,
    preparation_data: {},
    ...overrides,
  };
}

const fallbackGeometry = {
  kind: "point" as const,
  coordinates: [] as [number, number][],
  geojson: null,
  confidence: 0,
  geometrySource: "fallback_point" as const,
  origin: "fallback_point" as const,
};

describe("canonical department attribution", () => {
  it("maps nullable DB fields into ActionDataLocation without inference", () => {
    const contract = toActionContract(buildRow() as never);
    expect(contract.location.departmentCode).toBe("2B");
    expect(contract.location.departmentName).toBe("Haute-Corse");

    const empty = toActionContract(
      buildRow({
        department_code: null,
        department_name: null,
        location_label: "75020 Paris",
      }) as never,
    );
    expect(empty.location.departmentCode).toBeNull();
    expect(empty.location.departmentName).toBeNull();
  });

  it("writes explicit contract values and null defaults to actions persistence", () => {
    const payload = {
      actionDate: "2026-09-12",
      locationLabel: "Bastia",
      departmentCode: "2B",
      departmentName: "Haute-Corse",
      wasteKg: null,
      cigaretteButts: null,
      volunteersCount: 1,
      durationMinutes: 0,
    } as const;

    const withDepartment = buildActionInsertPayload({
      userId: "user-1",
      payload,
      persistedGeometry: fallbackGeometry,
      finalDrawing: null,
      status: "approved",
    });
    expect(withDepartment.department_code).toBe("2B");
    expect(withDepartment.department_name).toBe("Haute-Corse");

    const withoutDepartment = buildActionInsertPayload({
      userId: "user-1",
      payload: { ...payload, departmentCode: undefined, departmentName: undefined },
      persistedGeometry: fallbackGeometry,
      finalDrawing: null,
      status: "pending",
    });
    expect(withoutDepartment.department_code).toBeNull();
    expect(withoutDepartment.department_name).toBeNull();
  });

  it("round-trips the nullable event window without changing historical action time", () => {
    const contract = toActionContract(
      buildRow({
        duration_minutes: 75,
        event_start_time: "09:00:00",
        event_end_time: "10:45:00",
      }) as never,
    );

    expect(contract.metadata.durationMinutes).toBe(75);
    expect(contract.dates.eventStartTime).toBe("09:00");
    expect(contract.dates.eventEndTime).toBe("10:45");
  });

  it("resolves legacy and derived targets for presentation without mutating the row", () => {
    const policy: RouteDistancePolicy = {
      version: "route-distance-v2",
      kilometersPerHour: 2,
    };
    const row = buildRow({
      duration_minutes: 90,
      preparation_data: {
        routeTargetDistanceKm: 1.5,
        routeTargetDistanceSource: "derived",
        routeTargetDistancePolicyVersion: "route-distance-v1",
      },
    });
    const before = structuredClone(row);

    const contract = toActionContract(row as never, policy);

    expect(contract.metadata.preparationData).toMatchObject({
      routeTargetDistanceKm: 3,
      routeTargetDistanceSource: "derived",
      routeTargetDistancePolicyVersion: "route-distance-v2",
    });
    expect(buildActionEditorPayload(row as never)?.preparationData).toMatchObject({
      routeTargetDistanceKm: 1.5,
      routeTargetDistanceSource: "derived",
      routeTargetDistancePolicyVersion: "route-distance-v1",
    });
    expect(toActionContract(buildRow({ duration_minutes: 90 }) as never, policy)
      .metadata.preparationData).toMatchObject({
      routeTargetDistanceKm: 3,
      routeTargetDistanceSource: "derived",
      routeTargetDistancePolicyVersion: "route-distance-v2",
    });
    expect(row).toEqual(before);
  });

  it("keeps manual targets and GPX observations unchanged during presentation rebasing", () => {
    const policy: RouteDistancePolicy = {
      version: "route-distance-v2",
      kilometersPerHour: 2,
    };
    const gpxImport = {
      source: "gpx_import" as const,
      observedDistanceKm: 1.572,
      pointCount: 3,
      inferredTopology: "loop" as const,
      fileName: "terrain.gpx",
    };
    const gpxCoordinates: [number, number][] = [
      [48.85, 2.35],
      [48.86, 2.36],
      [48.85, 2.35],
    ];
    const gpxRow = buildRow({
      duration_minutes: 90,
      geometry_source: "gpx_import",
      notes: `[DRAWING_GEOJSON]${JSON.stringify({
        kind: "polyline",
        coordinates: gpxCoordinates,
      })}`,
      preparation_data: {
        routeTargetDistanceKm: 1.5,
        routeTargetDistanceSource: "derived",
        routeTargetDistancePolicyVersion: "route-distance-v1",
        routeObservedDistanceKm: gpxImport.observedDistanceKm,
        gpxImport,
      },
    });
    const manualRow = buildRow({
      duration_minutes: 90,
      preparation_data: {
        routeTargetDistanceKm: 2.25,
        routeTargetDistanceSource: "manual",
        routeTargetDistancePolicyVersion: "route-distance-v1",
      },
    });

    const gpxContract = toActionContract(gpxRow as never, policy);
    const manualContract = toActionContract(manualRow as never, policy);

    expect(gpxContract.metadata.preparationData).toMatchObject({
      routeTargetDistanceKm: 3,
      routeTargetDistanceSource: "derived",
      routeObservedDistanceKm: gpxImport.observedDistanceKm,
      gpxImport,
    });
    expect(gpxContract.metadata.manualDrawing).toEqual({
      kind: "polyline",
      coordinates: gpxCoordinates,
    });
    expect(manualContract.metadata.preparationData).toMatchObject({
      routeTargetDistanceKm: 2.25,
      routeTargetDistanceSource: "manual",
    });
    expect(manualContract.metadata.preparationData).not.toHaveProperty(
      "routeTargetDistancePolicyVersion",
    );
  });
});
