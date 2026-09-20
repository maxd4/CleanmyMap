import {
  normalizeCigaretteButtsMeasurementsFromUserInput,
  type ActionCigaretteButtsMeasurements,
} from "@/lib/waste/cigarette-butts";
import type { ActionMetadata, ActionUpdateInput } from "./action-update-audit";
import {
  normalizeVolunteerParticipation,
  resolveParticipantsCount,
  type ActionVolunteerParticipation,
} from "./volunteer-participation";
import type { ActionRow } from "@/types/database";

export type ActionUpdateMeasurements = {
  updateData: Record<string, unknown>;
  hasButtsMeasurementUpdate: boolean;
  nextCigaretteButtsMeasurements: ActionCigaretteButtsMeasurements | null;
  nextVolunteerParticipation: ActionVolunteerParticipation | null;
};

function hasButtsMeasurementUpdate(body: ActionUpdateInput): boolean {
  return [
    "cigaretteButtsMeasurements",
    "cigaretteButtsCount",
    "cigaretteButtsMassKg",
    "cigaretteButtsVolumeLiters",
    "cigaretteButtsCondition",
    "cigaretteButtsKg",
    "cigaretteButts",
  ].some((key) => Object.prototype.hasOwnProperty.call(body, key));
}

function buildButtsInput(
  current: ActionRow,
  body: ActionUpdateInput,
  currentMetadata: ActionMetadata,
) {
  const currentMeasurements = currentMetadata.cigaretteButtsMeasurements;
  return body.cigaretteButtsMeasurements !== undefined
    ? body.cigaretteButtsMeasurements === null
      ? {}
      : body.cigaretteButtsMeasurements
    : {
        cigaretteButtsCount:
          body.cigaretteButtsCount !== undefined
            ? body.cigaretteButtsCount
            : body.cigaretteButts !== undefined
              ? body.cigaretteButts
              : currentMeasurements?.cigaretteButtsCount ?? current.cigarette_butts,
        cigaretteButtsMassKg:
          body.cigaretteButtsMassKg !== undefined
            ? body.cigaretteButtsMassKg
            : body.cigaretteButtsKg !== undefined
              ? body.cigaretteButtsKg
              : currentMeasurements?.cigaretteButtsMassKg ?? currentMetadata.cigaretteButtsKg,
        cigaretteButtsVolumeLiters:
          body.cigaretteButtsVolumeLiters !== undefined
            ? body.cigaretteButtsVolumeLiters
            : currentMeasurements?.cigaretteButtsVolumeLiters ?? null,
        cigaretteButtsCondition:
          body.cigaretteButtsCondition !== undefined
            ? body.cigaretteButtsCondition
            : currentMeasurements?.cigaretteButtsCondition ?? null,
      };
}

function buildButtsOptions(body: ActionUpdateInput) {
  if (body.cigaretteButtsMeasurements !== undefined) {
    return { preserveExplicitNulls: true };
  }
  return {
    explicitNullFields: [
      ...(body.cigaretteButtsCount === null || body.cigaretteButts === null
        ? ["cigaretteButtsCount" as const]
        : []),
      ...(body.cigaretteButtsMassKg === null || body.cigaretteButtsKg === null
        ? ["cigaretteButtsMassKg" as const]
        : []),
      ...(body.cigaretteButtsVolumeLiters === null
        ? ["cigaretteButtsVolumeLiters" as const]
        : []),
    ],
  };
}

function buildButtsMeasurementUpdate(params: {
  current: ActionRow;
  body: ActionUpdateInput;
  currentMetadata: ActionMetadata;
}): {
  hasUpdate: boolean;
  measurements: ActionCigaretteButtsMeasurements | null;
  updateData: Record<string, unknown>;
} {
  const { current, body, currentMetadata } = params;
  const hasUpdate = hasButtsMeasurementUpdate(body);
  if (!hasUpdate) {
    return {
      hasUpdate,
      measurements: currentMetadata.cigaretteButtsMeasurements ?? null,
      updateData: {},
    };
  }
  const measurements = normalizeCigaretteButtsMeasurementsFromUserInput(
    buildButtsInput(current, body, currentMetadata),
    buildButtsOptions(body),
  );
  return {
    hasUpdate,
    measurements,
    updateData: { cigarette_butts: measurements.cigaretteButtsCount },
  };
}

function buildVolunteerMeasurementUpdate(params: {
  current: ActionRow;
  body: ActionUpdateInput;
  currentMetadata: ActionMetadata;
}): {
  participation: ActionVolunteerParticipation | null;
  updateData: Record<string, unknown>;
} {
  const { current, body, currentMetadata } = params;
  const hasUpdate = Object.prototype.hasOwnProperty.call(
    body,
    "volunteerParticipation",
  );
  const participation = hasUpdate
    ? body.volunteerParticipation === null || body.volunteerParticipation === undefined
      ? null
      : normalizeVolunteerParticipation(body.volunteerParticipation)
    : currentMetadata.volunteerParticipation;
  return {
    participation,
    updateData:
      hasUpdate || body.volunteersCount !== undefined
        ? {
            volunteers_count: resolveParticipantsCount({
              volunteerParticipation: participation,
              legacyVolunteersCount: body.volunteersCount ?? current.volunteers_count,
            }),
          }
        : {},
  };
}

export function buildActionUpdateMeasurements(params: {
  current: ActionRow;
  body: ActionUpdateInput;
  currentMetadata: ActionMetadata;
}): ActionUpdateMeasurements {
  const { current, body, currentMetadata } = params;
  const butts = buildButtsMeasurementUpdate({ current, body, currentMetadata });
  const volunteer = buildVolunteerMeasurementUpdate({ current, body, currentMetadata });

  return {
    updateData: { ...butts.updateData, ...volunteer.updateData },
    hasButtsMeasurementUpdate: butts.hasUpdate,
    nextCigaretteButtsMeasurements: butts.measurements,
    nextVolunteerParticipation: volunteer.participation,
  };
}
