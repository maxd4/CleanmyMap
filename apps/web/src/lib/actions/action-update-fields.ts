import { resolveActionDepartmentForPersistence } from "@/lib/geo/action-department-resolver";
import { normalizeActionPreparationData } from "@/lib/route/route-operational";
import {
  persistResolvedRouteTargetDistance,
  resolveRouteTargetDistance,
} from "@/lib/actions/route-target-distance";
import type { ActionRow } from "@/types/database";
import type { ActionUpdateInput } from "./action-update-audit";
import { resolveNextActionStatus } from "./action-update-status";

function buildPhaseAndPreparationFields(
  current: ActionRow,
  body: ActionUpdateInput,
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};
  if (body.actionPhase) {
    updateData["action_phase"] = body.actionPhase;
    if (body.actionPhase !== "post_action_draft") {
      updateData["status"] = resolveNextActionStatus({
        currentStatus: current.status,
        actionPhase: body.actionPhase,
      });
    }
  }
  if (body.preparationData !== undefined) {
    const nextPreparationData = normalizeActionPreparationData(body.preparationData ?? {});
    const resolvedTarget = resolveRouteTargetDistance({
      durationMinutes: body.durationMinutes ?? current.duration_minutes,
      routeTargetDistanceKm: nextPreparationData.routeTargetDistanceKm,
      routeTargetDistanceSource: nextPreparationData.routeTargetDistanceSource,
    });
    updateData["preparation_data"] = persistResolvedRouteTargetDistance(
      nextPreparationData,
      resolvedTarget,
    );
  }
  return updateData;
}

function buildScalarFields(body: ActionUpdateInput): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};
  if (body.actorName !== undefined) updateData["actor_name"] = body.actorName.trim() || null;
  if (body.actionDate !== undefined) updateData["action_date"] = body.actionDate;
  if (body.locationLabel !== undefined) updateData["location_label"] = body.locationLabel.trim();
  if (body.latitude !== undefined) updateData["latitude"] = body.latitude;
  if (body.longitude !== undefined) updateData["longitude"] = body.longitude;
  return updateData;
}

async function buildDepartmentFields(
  current: ActionRow,
  body: ActionUpdateInput,
): Promise<Record<string, unknown>> {
  const coordinatesChanged =
    (body.latitude !== undefined && body.latitude !== current.latitude) ||
    (body.longitude !== undefined && body.longitude !== current.longitude);
  const department = await resolveActionDepartmentForPersistence({
    latitude: body.latitude ?? current.latitude,
    longitude: body.longitude ?? current.longitude,
    geometry: coordinatesChanged
      ? null
      : {
          kind: current.derived_geometry_kind,
          geojson: current.derived_geometry_geojson,
        },
    existingDepartmentCode: current.department_code,
    existingDepartmentName: current.department_name,
    spatiallyChanged: coordinatesChanged,
  });
  return {
    department_code: department.departmentCode,
    department_name: department.departmentName,
  };
}

function buildTimingFields(
  current: ActionRow,
  body: ActionUpdateInput,
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};
  if (body.wasteKg !== undefined) updateData["waste_kg"] = body.wasteKg;
  if (body.durationMinutes !== undefined) {
    updateData["duration_minutes"] = body.durationMinutes;
    if (body.preparationData === undefined) {
      const currentPreparationData = normalizeActionPreparationData(
        current.preparation_data ?? {},
      );
      const resolvedTarget = resolveRouteTargetDistance({
        durationMinutes: body.durationMinutes,
        routeTargetDistanceKm: currentPreparationData.routeTargetDistanceKm,
        routeTargetDistanceSource: currentPreparationData.routeTargetDistanceSource,
      });
      updateData["preparation_data"] = persistResolvedRouteTargetDistance(
        currentPreparationData,
        resolvedTarget,
      );
    }
  }
  if (body.eventStartTime !== undefined) updateData["event_start_time"] = body.eventStartTime;
  if (body.eventEndTime !== undefined) updateData["event_end_time"] = body.eventEndTime;
  if (body.organizerType !== undefined) updateData["organizer_type"] = body.organizerType;
  if (body.organizerId !== undefined) updateData["organizer_id"] = body.organizerId;
  if (body.organizerName !== undefined) updateData["organizer_name"] = body.organizerName?.trim() || null;
  return updateData;
}

export async function buildActionUpdateFields(params: {
  current: ActionRow;
  body: ActionUpdateInput;
}): Promise<Record<string, unknown>> {
  const { current, body } = params;
  const updateData: Record<string, unknown> = {};
  Object.assign(updateData, buildPhaseAndPreparationFields(current, body));
  Object.assign(updateData, buildScalarFields(body));
  Object.assign(updateData, await buildDepartmentFields(current, body));
  Object.assign(updateData, buildTimingFields(current, body));

  return updateData;
}
