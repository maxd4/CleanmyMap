import {
  normalizeCigaretteButtsMeasurementsFromUserInput,
  type ActionCigaretteButtsMeasurements,
} from "@/lib/waste/cigarette-butts";
import type { ActionMetadata, ActionUpdateInput } from "./action-update-audit";
import {
  normalizeActionVolunteerParticipationFromTotal,
  resolvePersistedVolunteerComposition,
  resolvePersistedVolunteerParticipation,
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
  const currentCount = currentMeasurements
    ? currentMeasurements.cigaretteButtsCount
    : current.cigarette_butts;
  const currentMass = currentMeasurements
    ? currentMeasurements.cigaretteButtsMassKg
    : currentMetadata.cigaretteButtsKg;
  const currentVolume = currentMeasurements?.cigaretteButtsVolumeLiters ?? null;
  const currentCondition = currentMeasurements?.cigaretteButtsCondition ?? null;
  const submittedMeasurements = body.cigaretteButtsMeasurements;

  if (submittedMeasurements === null) return {};
  if (submittedMeasurements !== undefined) return {
    cigaretteButtsCount: submittedMeasurements.cigaretteButtsCount !== undefined ? submittedMeasurements.cigaretteButtsCount : currentCount,
    cigaretteButtsMassKg: submittedMeasurements.cigaretteButtsMassKg !== undefined ? submittedMeasurements.cigaretteButtsMassKg : currentMass,
    cigaretteButtsVolumeLiters: submittedMeasurements.cigaretteButtsVolumeLiters !== undefined ? submittedMeasurements.cigaretteButtsVolumeLiters : currentVolume,
    cigaretteButtsCondition: submittedMeasurements.cigaretteButtsCondition !== undefined ? submittedMeasurements.cigaretteButtsCondition : currentCondition,
    cigaretteButtsInputSource: submittedMeasurements.cigaretteButtsInputSource,
  };
  return buildLegacyButtsInput(body, currentCount, currentMass, currentVolume, currentCondition);
}

function buildLegacyButtsInput(
  body: ActionUpdateInput,
  currentCount: number | null,
  currentMass: number | null,
  currentVolume: number | null,
  currentCondition: ActionCigaretteButtsMeasurements["cigaretteButtsCondition"] | null,
) {
  return {
    cigaretteButtsCount: resolveLegacyCount(body, currentCount),
    cigaretteButtsMassKg: resolveLegacyMass(body, currentMass),
    cigaretteButtsVolumeLiters: body.cigaretteButtsVolumeLiters !== undefined ? body.cigaretteButtsVolumeLiters : currentVolume,
    cigaretteButtsCondition: body.cigaretteButtsCondition !== undefined ? body.cigaretteButtsCondition : currentCondition,
  };
}

function resolveLegacyCount(body: ActionUpdateInput, current: number | null) {
  return body.cigaretteButtsCount !== undefined ? body.cigaretteButtsCount : body.cigaretteButts !== undefined ? body.cigaretteButts : current;
}

function resolveLegacyMass(body: ActionUpdateInput, current: number | null) {
  return body.cigaretteButtsMassKg !== undefined ? body.cigaretteButtsMassKg : body.cigaretteButtsKg !== undefined ? body.cigaretteButtsKg : current;
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
    {
      ...buildButtsOptions(body),
      existingMeasurements: currentMetadata.cigaretteButtsMeasurements,
    },
  );
  return {
    hasUpdate,
    measurements,
    updateData: { cigarette_butts: measurements.cigaretteButtsCount },
  };
}

function resolveVolunteerParticipationUpdate(params: {
  current: ActionRow;
  body: ActionUpdateInput;
  currentMetadata: ActionMetadata;
}) {
  const { current, body, currentMetadata } = params;
  const hasUpdate = Object.prototype.hasOwnProperty.call(
    body,
    "volunteerParticipation",
  );
  const resolveFromActionTotal =
    current.action_phase !== "pre_action" ||
    body.actionPhase === "post_action_complete";
  const currentPersistedParticipation = resolvePersistedVolunteerParticipation({
    childrenCount: current.children_count,
    adultCount: current.adult_count,
    retiredCount: current.retired_count,
    volunteersCount: current.volunteers_count,
    legacyParticipation: currentMetadata.volunteerParticipation,
  });
  const participation = hasUpdate
    ? body.volunteerParticipation === null || body.volunteerParticipation === undefined
      ? null
      : resolveFromActionTotal
        ? normalizeActionVolunteerParticipationFromTotal({
            volunteersCount: body.volunteersCount ?? current.volunteers_count,
            volunteerParticipation: body.volunteerParticipation,
          })
        : normalizeVolunteerParticipation(body.volunteerParticipation)
    : currentPersistedParticipation ?? currentMetadata.volunteerParticipation;
  const normalizedParticipation =
    !resolveFromActionTotal ||
    participation === null ||
    (body.volunteerParticipation === undefined && body.volunteersCount === undefined)
      ? participation
      : normalizeActionVolunteerParticipationFromTotal({
          volunteersCount: body.volunteersCount ?? current.volunteers_count,
          volunteerParticipation: participation,
        });
  return { participation: normalizedParticipation, shouldPersist: hasUpdate || body.volunteersCount !== undefined };
}

function buildVolunteerUpdateData(params: {
  current: ActionRow;
  body: ActionUpdateInput;
  participation: ActionVolunteerParticipation | null;
  shouldPersist: boolean;
}) {
  if (!params.shouldPersist) return {};
  const volunteersCount = resolveParticipantsCount({
    volunteerParticipation: params.participation,
    legacyVolunteersCount: params.body.volunteersCount ?? params.current.volunteers_count,
  });
  return {
    volunteers_count: volunteersCount,
    ...resolvePersistedVolunteerComposition({ participation: params.participation, volunteersCount }),
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
  const resolved = resolveVolunteerParticipationUpdate(params);
  return {
    participation: resolved.participation,
    updateData: buildVolunteerUpdateData({ ...params, participation: resolved.participation, shouldPersist: resolved.shouldPersist }),
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
