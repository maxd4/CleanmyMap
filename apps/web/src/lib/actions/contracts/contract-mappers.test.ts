import { describe, expect, it } from "vitest";
import { toActionContract } from "@/lib/actions/unified-source/contracts";
import { buildActionInsertPayload } from "@/lib/actions/store";

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
});
