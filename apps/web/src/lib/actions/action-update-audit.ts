import { normalizeActionPreparationData } from "@/lib/route/route-operational";
import { normalizeClockTime } from "./time-contract";
import { resolveNextActionStatus } from "./action-update-status";
import type { ActionPermissionIdentity } from "./permissions";
import type { extractActionMetadataFromNotes } from "./metadata";
import type { ActionRow } from "@/types/database";
import type { updateActionSchema } from "@/lib/validation/action";
import { z } from "zod";

export type ActionUpdateInput = z.infer<typeof updateActionSchema>;
export type ActionMetadata = ReturnType<typeof extractActionMetadataFromNotes>;
export type ActionSnapshotSource = ActionRow;

export type ActionAuditSnapshot = {
  status: ActionSnapshotSource["status"];
  actionPhase: ActionSnapshotSource["action_phase"];
  groupJoinEnabled: boolean;
  wasteKg: number | null;
  cigaretteButtsKg: number | null;
  cigaretteButts: number | null;
  volunteersCount: number | null;
  durationMinutes: number | null;
  wasteMeasurementMethod: string | null;
  eventStartTime: string | null;
  eventEndTime: string | null;
  actorNameChanged: boolean;
  locationChanged: boolean;
  coordinatesChanged: boolean;
  notesChanged: boolean;
  preparationDataChanged: boolean;
  participantsChanged: boolean;
  wasteBreakdownChanged: boolean;
  photosChanged: boolean;
};

export type ActionAuditSnapshots = {
  previousValue: ActionAuditSnapshot;
  newValue: ActionAuditSnapshot;
};

function normalizeComparableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeComparableValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, normalizeComparableValue(nestedValue)]),
    );
  }
  return value;
}

function valuesAreEqual(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(normalizeComparableValue(left)) ===
    JSON.stringify(normalizeComparableValue(right))
  );
}

function projectPhotoMetadata(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((photo) => {
    const item = photo as {
      id?: unknown;
      name?: unknown;
      mimeType?: unknown;
      size?: unknown;
      width?: unknown;
      height?: unknown;
    };
    return {
      id: item.id ?? null,
      name: item.name ?? null,
      mimeType: item.mimeType ?? null,
      size: item.size ?? null,
      width: item.width ?? null,
      height: item.height ?? null,
    };
  });
}

export function buildActionAuditSnapshots(
  current: ActionSnapshotSource,
  body: ActionUpdateInput,
  currentMetadata: ActionMetadata,
  permissionIdentity: ActionPermissionIdentity | null | undefined,
): ActionAuditSnapshots {
  const currentPreparationData = normalizeActionPreparationData(
    current.preparation_data ?? {},
  );
  const nextPreparationData =
    body.preparationData === undefined
      ? currentPreparationData
      : body.preparationData ?? {};
  const nextActionPhase = body.actionPhase ?? current.action_phase;
  const nextStatus = resolveNextActionStatus({
    currentStatus: current.status,
    actionPhase: body.actionPhase,
    permissionIdentity,
    createdByClerkId: current.created_by_clerk_id,
  });

  const nextActorName =
    body.actorName === undefined
      ? current.actor_name ?? null
      : body.actorName.trim() || null;
  const nextLocation =
    body.locationLabel === undefined
      ? current.location_label
      : body.locationLabel.trim();
  const nextLatitude = body.latitude ?? current.latitude;
  const nextLongitude = body.longitude ?? current.longitude;
  const nextNotes =
    body.notes === undefined ? currentMetadata.cleanNotes : body.notes.trim() || null;
  const nextWasteBreakdown =
    body.wasteBreakdown === undefined
      ? currentMetadata.wasteBreakdown
      : body.wasteBreakdown;
  const nextPhotos =
    body.photos === undefined ? currentMetadata.photos : body.photos;

  const flags = {
    actorNameChanged:
      body.actorName !== undefined && nextActorName !== (current.actor_name ?? null),
    locationChanged:
      body.locationLabel !== undefined && nextLocation !== current.location_label,
    coordinatesChanged:
      body.latitude !== undefined || body.longitude !== undefined
        ? nextLatitude !== current.latitude || nextLongitude !== current.longitude
        : false,
    notesChanged:
      body.notes !== undefined && nextNotes !== currentMetadata.cleanNotes,
    preparationDataChanged:
      body.preparationData !== undefined &&
      !valuesAreEqual(nextPreparationData, currentPreparationData),
    participantsChanged: body.participantAccounts !== undefined,
    wasteBreakdownChanged:
      body.wasteBreakdown !== undefined &&
      !valuesAreEqual(nextWasteBreakdown, currentMetadata.wasteBreakdown),
    photosChanged:
      body.photos !== undefined &&
      !valuesAreEqual(
        projectPhotoMetadata(nextPhotos),
        projectPhotoMetadata(currentMetadata.photos),
      ),
  };

  return {
    previousValue: {
      status: current.status,
      actionPhase: current.action_phase,
      groupJoinEnabled: currentMetadata.groupJoinEnabled,
      wasteKg: current.waste_kg ?? null,
      cigaretteButtsKg: currentMetadata.cigaretteButtsKg,
      cigaretteButts: current.cigarette_butts ?? null,
      volunteersCount: current.volunteers_count ?? null,
      durationMinutes: current.duration_minutes ?? null,
      wasteMeasurementMethod: currentMetadata.wasteMeasurementMethod,
      eventStartTime: normalizeClockTime(current.event_start_time),
      eventEndTime: normalizeClockTime(current.event_end_time),
      ...flags,
    },
    newValue: {
      status: nextStatus,
      actionPhase: nextActionPhase,
      groupJoinEnabled:
        body.groupJoinEnabled ?? currentMetadata.groupJoinEnabled,
      wasteKg:
        body.wasteKg !== undefined ? body.wasteKg : current.waste_kg ?? null,
      cigaretteButtsKg:
        body.cigaretteButtsKg !== undefined
          ? body.cigaretteButtsKg
          : currentMetadata.cigaretteButtsKg,
      cigaretteButts:
        body.cigaretteButts !== undefined
          ? body.cigaretteButts
          : current.cigarette_butts ?? null,
      volunteersCount:
        body.volunteersCount ?? current.volunteers_count ?? null,
      durationMinutes:
        body.durationMinutes ?? current.duration_minutes ?? null,
      wasteMeasurementMethod:
        body.wasteMeasurementMethod !== undefined
          ? body.wasteMeasurementMethod
          : currentMetadata.wasteMeasurementMethod,
      eventStartTime:
        body.eventStartTime !== undefined
          ? body.eventStartTime
          : normalizeClockTime(current.event_start_time),
      eventEndTime:
        body.eventEndTime !== undefined
          ? body.eventEndTime
          : normalizeClockTime(current.event_end_time),
      ...flags,
    },
  };
}
