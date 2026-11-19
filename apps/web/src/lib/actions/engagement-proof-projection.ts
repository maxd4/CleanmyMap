import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { INDIVIDUAL_IMPACT_SELECT } from "./participation/individual-impact";
import {
  availableField,
  buildCommunicableReference,
  buildFieldRoleAttestedMission,
  buildSpogomiAttestedMission,
  errorField,
  isCommunicableFinalizedAction,
  resolveActionContextValue,
  resolveActionTitle,
  resolveCollectiveActionResults,
  resolveCommunicableOrganization,
  resolvePersonalDeclaration,
  unavailableField,
  type RawActionRow,
  type RawParticipantRow,
  type RawRoleAttestationRow,
  type RawSpogomiAttestationRow,
  type RawSpogomiEventRow,
  type RawSpogomiParticipantRow,
} from "./engagement-proof-projection.helpers";
import type {
  EngagementProofAttestedMission,
  EngagementProofDistinctSections,
  EngagementProofOrganizationSummary,
  EngagementProofParticipationItem,
  EngagementProofPeriodItem,
  EngagementProofPrivacyAndMethodology,
  EngagementProofVerifiedHours,
  PersonalEngagementProofProjection,
} from "./engagement-proof-projection.types";

const MAX_PARTICIPATION_READ_LIMIT = 10000;

const ACTION_ENGAGEMENT_COLUMNS =
  "id, created_at, action_date, location_label, department_code, department_name, actor_name, organizer_name, organizer_type, action_context, status, action_phase, published_at, cancelled_at, moderation_visibility, access_mode, data_provenance, duration_minutes, volunteers_count, waste_kg, cigarette_butts, notes, preparation_data";

const PRIVACY_AND_METHODOLOGY_CONTRACT: EngagementProofPrivacyAndMethodology = {
  evaluationMode: "live_on_read_no_cache_no_counter",
  ownerScopedOnly: true,
  peerPersonalDataDisclosed: false,
  reviewerIdentitiesDisclosed: false,
  sensitiveAdministrativeOrMigratoryDataCollected: false,
  individualHoursDeducedFromActionDuration: false,
  certifiedSkillsDeducedFromRoles: false,
  nonCollectorMissionsAttributeZeroCollectionFictitiously: false,
  unavailableDataTurnedIntoZero: false,
};

const OVERALL_VERIFIED_HOURS_UNAVAILABLE: EngagementProofVerifiedHours = {
  status: "unavailable",
  totalHours: null,
  reason: "individual_attendance_duration_not_measured",
};

const ACTION_VERIFIED_HOURS_UNAVAILABLE: EngagementProofVerifiedHours = {
  status: "unavailable",
  totalHours: null,
  reason: "action_duration_not_individual_proof",
};

export type LoadedEngagementProofSources = {
  participantRows: RawParticipantRow[];
  actions: RawActionRow[];
  roleAttestations: RawRoleAttestationRow[];
  spogomiParticipants: RawSpogomiParticipantRow[];
  spogomiEvents: RawSpogomiEventRow[];
  spogomiAttestations: RawSpogomiAttestationRow[];
};

export class EngagementProofReadError extends Error {
  readonly failedSource:
    | "actionParticipants"
    | "actions"
    | "actionRoleAttestations"
    | "spogomiEquivalence";

  constructor(
    failedSource: EngagementProofReadError["failedSource"],
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "EngagementProofReadError";
    this.failedSource = failedSource;
  }
}

function chooseCanonicalParticipantRow(
  existing: RawParticipantRow,
  candidate: RawParticipantRow,
): RawParticipantRow {
  const existingHasImpact =
    existing.individual_waste_kg != null ||
    existing.individual_cigarette_butts_count != null ||
    existing.individual_cigarette_butts_mass_kg != null ||
    existing.individual_cigarette_butts_lots != null;
  const candidateHasImpact =
    candidate.individual_waste_kg != null ||
    candidate.individual_cigarette_butts_count != null ||
    candidate.individual_cigarette_butts_mass_kg != null ||
    candidate.individual_cigarette_butts_lots != null;
  if (candidateHasImpact && !existingHasImpact) return candidate;
  if (existingHasImpact && !candidateHasImpact) return existing;

  const existingJoined = existing.joined_at ?? existing.created_at ?? "";
  const candidateJoined = candidate.joined_at ?? candidate.created_at ?? "";
  if (candidateJoined && (!existingJoined || candidateJoined < existingJoined)) {
    return candidate;
  }
  return existing;
}

function deduplicateConfirmedParticipantsByActionId(
  rows: readonly RawParticipantRow[],
  userId: string,
): Map<string, RawParticipantRow> {
  const byActionId = new Map<string, RawParticipantRow>();
  for (const row of rows) {
    if (row.user_id !== userId || row.participation_status !== "confirmed") continue;
    const actionId = typeof row.action_id === "string" ? row.action_id.trim() : "";
    if (!actionId) continue;
    const current = byActionId.get(actionId);
    byActionId.set(actionId, current ? chooseCanonicalParticipantRow(current, row) : row);
  }
  return byActionId;
}

function collectMissionsByActionId(
  sources: LoadedEngagementProofSources,
  eligibleActionsById: Map<string, RawActionRow>,
  userId: string,
): Map<string, EngagementProofAttestedMission[]> {
  const missionsByActionId = new Map<string, EngagementProofAttestedMission[]>();
  const seenMissionKeys = new Set<string>();

  for (const row of sources.roleAttestations) {
    const action = eligibleActionsById.get(row.action_id);
    if (!action) continue;
    const mission = buildFieldRoleAttestedMission(row, action, userId);
    if (!mission) continue;
    const dedupeKey = `${mission.actionId}:${mission.source}:${mission.roleCode}`;
    if (seenMissionKeys.has(dedupeKey)) continue;
    seenMissionKeys.add(dedupeKey);
    missionsByActionId.set(action.id, [...(missionsByActionId.get(action.id) ?? []), mission]);
  }

  const spogomiParticipantsByEventId = new Map<string, RawSpogomiParticipantRow>();
  for (const participant of sources.spogomiParticipants) {
    if (
      participant.clerk_id === userId &&
      participant.account_link_status === "verified" &&
      participant.attendance_status === "present" &&
      participant.registration_status !== "withdrawn"
    ) {
      spogomiParticipantsByEventId.set(participant.event_id, participant);
    }
  }

  const spogomiEventsById = new Map<string, RawSpogomiEventRow>(
    sources.spogomiEvents.map((event) => [event.id, event]),
  );

  for (const attestation of sources.spogomiAttestations) {
    const event = spogomiEventsById.get(attestation.event_id);
    const participant = spogomiParticipantsByEventId.get(attestation.event_id);
    if (!event || !participant || participant.id !== attestation.participant_id) continue;
    const actionId = typeof event.action_id === "string" ? event.action_id : "";
    const action = eligibleActionsById.get(actionId);
    if (!action) continue;
    const mission = buildSpogomiAttestedMission({
      attestation,
      participant,
      event,
      action,
      userId,
    });
    if (!mission) continue;
    const dedupeKey = `${mission.actionId}:${mission.source}:${mission.roleCode}:${mission.missionId}`;
    if (seenMissionKeys.has(dedupeKey)) continue;
    seenMissionKeys.add(dedupeKey);
    missionsByActionId.set(action.id, [...(missionsByActionId.get(action.id) ?? []), mission]);
  }

  for (const [actionId, missions] of missionsByActionId.entries()) {
    missionsByActionId.set(
      actionId,
      [...missions].sort((left, right) =>
        `${left.actionDate}:${left.roleCode}:${left.missionId}`.localeCompare(
          `${right.actionDate}:${right.roleCode}:${right.missionId}`,
        ),
      ),
    );
  }

  return missionsByActionId;
}

function buildPeriodSummaries(
  participations: readonly EngagementProofParticipationItem[],
  kind: "year" | "month",
): EngagementProofPeriodItem[] {
  const groups = new Map<
    string,
    {
      startDate: string;
      endDate: string;
      confirmedParticipationsCount: number;
      attestedMissionsCount: number;
      organizationKeys: Set<string>;
    }
  >();

  for (const item of participations) {
    const datePrefix = item.actionDate.slice(0, 10);
    const periodKey = kind === "year" ? datePrefix.slice(0, 4) : datePrefix.slice(0, 7);
    if (!periodKey) continue;
    const current = groups.get(periodKey) ?? {
      startDate: datePrefix,
      endDate: datePrefix,
      confirmedParticipationsCount: 0,
      attestedMissionsCount: 0,
      organizationKeys: new Set<string>(),
    };
    if (datePrefix < current.startDate) current.startDate = datePrefix;
    if (datePrefix > current.endDate) current.endDate = datePrefix;
    current.confirmedParticipationsCount += 1;
    current.attestedMissionsCount += item.attestedMissions.length;
    if (item.organization.value) {
      current.organizationKeys.add(item.organization.value.organizationKey);
    }
    groups.set(periodKey, current);
  }

  return [...groups.entries()]
    .sort(([leftKey], [rightKey]) => rightKey.localeCompare(leftKey))
    .map(([periodKey, summary]) => ({
      periodKey,
      periodKind: kind,
      startDate: summary.startDate,
      endDate: summary.endDate,
      confirmedParticipationsCount: summary.confirmedParticipationsCount,
      attestedMissionsCount: summary.attestedMissionsCount,
      distinctOrganizationsCount: summary.organizationKeys.size,
      verifiedHours: OVERALL_VERIFIED_HOURS_UNAVAILABLE,
    }));
}

function buildOrganizationSummaries(
  participations: readonly EngagementProofParticipationItem[],
): EngagementProofOrganizationSummary[] {
  const byKey = new Map<
    string,
    {
      organizationKey: string;
      name: string;
      organizerType: EngagementProofOrganizationSummary["organizerType"];
      organizerTypeLabel: string;
      confirmedParticipationsCount: number;
      attestedMissionsCount: number;
      firstActionDate: string;
      lastActionDate: string;
      actionIds: string[];
    }
  >();

  for (const item of participations) {
    const org = item.organization.value;
    if (!org) continue;
    const datePrefix = item.actionDate.slice(0, 10);
    const current = byKey.get(org.organizationKey);
    if (!current) {
      byKey.set(org.organizationKey, {
        organizationKey: org.organizationKey,
        name: org.name,
        organizerType: org.organizerType,
        organizerTypeLabel: org.organizerTypeLabel,
        confirmedParticipationsCount: 1,
        attestedMissionsCount: item.attestedMissions.length,
        firstActionDate: datePrefix,
        lastActionDate: datePrefix,
        actionIds: [item.actionId],
      });
      continue;
    }
    current.confirmedParticipationsCount += 1;
    current.attestedMissionsCount += item.attestedMissions.length;
    if (datePrefix < current.firstActionDate) current.firstActionDate = datePrefix;
    if (datePrefix > current.lastActionDate) current.lastActionDate = datePrefix;
    current.actionIds.push(item.actionId);
  }

  return [...byKey.values()].sort((left, right) =>
    `${right.lastActionDate}:${left.name}`.localeCompare(`${left.lastActionDate}:${right.name}`),
  );
}

function buildDistinctSections(
  participations: readonly EngagementProofParticipationItem[],
  allMissions: readonly EngagementProofAttestedMission[],
): EngagementProofDistinctSections {
  const dates = participations.map((item) => item.actionDate.slice(0, 10)).sort();
  const firstActionDate = dates[0] ?? null;
  const lastActionDate = dates[dates.length - 1] ?? null;

  const declaredItems = participations
    .map((item) => item.personalDeclaration.value)
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const actionsWithMissionsCount = participations.filter(
    (item) => item.attestedMissions.length > 0,
  ).length;

  const durationValues = participations
    .map((item) => item.collectiveResults.actionDurationMinutes.value)
    .filter((val): val is number => val !== null);
  const wasteValues = participations
    .map((item) => item.collectiveResults.collectiveWasteKg.value)
    .filter((val): val is number => val !== null);
  const buttsValues = participations
    .map((item) => item.collectiveResults.collectiveCigaretteButtsCount.value)
    .filter((val): val is number => val !== null);

  const actionsWithCollectiveDataCount = participations.filter(
    (item) =>
      item.collectiveResults.actionDurationMinutes.value !== null ||
      item.collectiveResults.collectiveWasteKg.value !== null ||
      item.collectiveResults.collectiveCigaretteButtsCount.value !== null,
  ).length;

  return {
    presenceConfirmed: availableField({
      confirmedActionCount: participations.length,
      firstActionDate,
      lastActionDate,
    }),
    attestedMissions: availableField({
      attestedMissionCount: allMissions.length,
      actionsWithAttestedMissionCount: actionsWithMissionsCount,
      items: [...allMissions],
    }),
    verifiedHours: OVERALL_VERIFIED_HOURS_UNAVAILABLE,
    personalDeclarations:
      declaredItems.length > 0
        ? availableField({
            declaredActionCount: declaredItems.length,
            items: declaredItems,
            disclaimer:
              "Mesures ou déclarations individuelles enregistrées sur la fiche participant ; elles restent distinctes d’une attestation officielle de mission ou de compétences.",
          })
        : unavailableField("no_individual_declarations_recorded"),
    collectiveResults:
      actionsWithCollectiveDataCount > 0
        ? availableField({
            actionsWithCollectiveDataCount,
            collectiveActionDurationMinutesTotal:
              durationValues.length > 0
                ? availableField(durationValues.reduce((sum, val) => sum + val, 0))
                : unavailableField("no_collective_action_durations_recorded"),
            collectiveWasteKgTotal:
              wasteValues.length > 0
                ? availableField(
                    Math.round(wasteValues.reduce((sum, val) => sum + val, 0) * 1000) / 1000,
                  )
                : unavailableField("no_collective_waste_kg_recorded"),
            collectiveCigaretteButtsTotal:
              buttsValues.length > 0
                ? availableField(buttsValues.reduce((sum, val) => sum + val, 0))
                : unavailableField("no_collective_cigarette_butts_recorded"),
            disclaimer:
              "Résultats collectifs de l’action à laquelle la présence est confirmée ; ces totaux ne constituent ni un temps de présence individuel ni une collecte individuelle.",
          })
        : unavailableField("no_collective_results_recorded"),
  };
}

export function buildPersonalEngagementProofProjectionFromSources(params: {
  userId: string;
  sources: LoadedEngagementProofSources;
  now?: Date;
}): PersonalEngagementProofProjection {
  const { userId, sources, now = new Date() } = params;
  const deduplicatedParticipants = deduplicateConfirmedParticipantsByActionId(
    sources.participantRows,
    userId,
  );

  const eligibleActionsById = new Map<string, RawActionRow>();
  for (const action of sources.actions) {
    if (!deduplicatedParticipants.has(action.id)) continue;
    if (!isCommunicableFinalizedAction(action)) continue;
    eligibleActionsById.set(action.id, action);
  }

  const missionsByActionId = collectMissionsByActionId(sources, eligibleActionsById, userId);

  const participations: EngagementProofParticipationItem[] = [...eligibleActionsById.values()]
    .sort((left, right) =>
      `${right.action_date}:${right.created_at}:${right.id}`.localeCompare(
        `${left.action_date}:${left.created_at}:${left.id}`,
      ),
    )
    .map((action) => {
      const participantRow = deduplicatedParticipants.get(action.id)!;
      const organization = resolveCommunicableOrganization(action);
      const attestedMissions = missionsByActionId.get(action.id) ?? [];
      const personalDeclaration = resolvePersonalDeclaration(participantRow, action);
      const collectiveResults = resolveCollectiveActionResults(action);
      const communicableReference = buildCommunicableReference({
        userId,
        action,
        organization,
        missions: attestedMissions,
      });

      return {
        actionId: action.id,
        actionDate: action.action_date,
        actionTitle: resolveActionTitle(action),
        locationLabel: action.location_label,
        departmentCode: action.department_code ?? null,
        departmentName: action.department_name ?? null,
        actionContext: resolveActionContextValue(action),
        presence: {
          status: "confirmed",
          confirmedAt:
            participantRow.joined_at ?? participantRow.created_at ?? action.action_date,
          participationSource: participantRow.participation_source ?? "post_action_claim",
          provenanceTable: "action_participants",
        },
        organization,
        attestedMissions,
        verifiedHours: ACTION_VERIFIED_HOURS_UNAVAILABLE,
        personalDeclaration,
        collectiveResults,
        communicableReference,
      };
    });

  const allMissions = participations.flatMap((item) => item.attestedMissions);
  const organizations = buildOrganizationSummaries(participations);
  const communicableReferences = participations.map((item) => item.communicableReference);
  const byYear = buildPeriodSummaries(participations, "year");
  const byMonth = buildPeriodSummaries(participations, "month");
  const sortedDates = participations.map((item) => item.actionDate.slice(0, 10)).sort();

  return {
    status: "available",
    generatedAt: now.toISOString(),
    ownerUserId: userId,
    sourceStates: {
      actionParticipants: "available",
      actions: "available",
      actionRoleAttestations: "available",
      spogomiEquivalence: "available",
    },
    errorReason: null,
    periods: availableField({
      overallStartDate: sortedDates[0] ?? null,
      overallEndDate: sortedDates[sortedDates.length - 1] ?? null,
      byYear,
      byMonth,
    }),
    participations: availableField(participations),
    missions: availableField(allMissions),
    organizations:
      organizations.length > 0
        ? availableField(organizations)
        : unavailableField("no_communicable_organization_recorded"),
    communicableReferences: availableField(communicableReferences),
    distinctions: buildDistinctSections(participations, allMissions),
    privacyAndMethodology: PRIVACY_AND_METHODOLOGY_CONTRACT,
  };
}

export function buildErrorEngagementProofProjection(params: {
  userId: string;
  failedSource: EngagementProofReadError["failedSource"];
  reason: string;
  now?: Date;
}): PersonalEngagementProofProjection {
  const { userId, failedSource, reason, now = new Date() } = params;
  return {
    status: "error",
    generatedAt: now.toISOString(),
    ownerUserId: userId,
    sourceStates: {
      actionParticipants: failedSource === "actionParticipants" ? "error" : "unavailable",
      actions: failedSource === "actions" ? "error" : "unavailable",
      actionRoleAttestations: failedSource === "actionRoleAttestations" ? "error" : "unavailable",
      spogomiEquivalence: failedSource === "spogomiEquivalence" ? "error" : "unavailable",
    },
    errorReason: reason,
    periods: errorField(reason),
    participations: errorField(reason),
    missions: errorField(reason),
    organizations: errorField(reason),
    communicableReferences: errorField(reason),
    distinctions: {
      presenceConfirmed: errorField(reason),
      attestedMissions: errorField(reason),
      verifiedHours: OVERALL_VERIFIED_HOURS_UNAVAILABLE,
      personalDeclarations: errorField(reason),
      collectiveResults: errorField(reason),
    },
    privacyAndMethodology: PRIVACY_AND_METHODOLOGY_CONTRACT,
  };
}

async function loadOwnerConfirmedParticipants(
  supabase: SupabaseClient,
  userId: string,
): Promise<RawParticipantRow[]> {
  const result = await supabase
    .from("action_participants")
    .select(
      `id, action_id, user_id, joined_at, created_at, updated_at, participation_status, participation_source, ${INDIVIDUAL_IMPACT_SELECT}`,
    )
    .eq("user_id", userId)
    .eq("participation_status", "confirmed")
    .limit(MAX_PARTICIPATION_READ_LIMIT);

  if (result.error) {
    throw new EngagementProofReadError("actionParticipants", result.error.message, {
      cause: result.error,
    });
  }
  if (!Array.isArray(result.data)) {
    throw new EngagementProofReadError(
      "actionParticipants",
      "La lecture des participations confirmées est incomplète.",
    );
  }
  return result.data as unknown as RawParticipantRow[];
}

async function loadActionsAndAttestationsForActionIds(
  supabase: SupabaseClient,
  userId: string,
  actionIds: readonly string[],
): Promise<{
  actions: RawActionRow[];
  roleAttestations: RawRoleAttestationRow[];
}> {
  if (actionIds.length === 0) {
    return { actions: [], roleAttestations: [] };
  }
  const [actionsResult, attestationsResult] = await Promise.all([
    supabase
      .from("actions")
      .select(ACTION_ENGAGEMENT_COLUMNS)
      .in("id", [...actionIds]),
    supabase
      .from("action_role_attestations")
      .select(
        "id, action_id, user_id, role_code, verification_status, decided_at, responsibility_provenance, provenance_snapshot, revision",
      )
      .eq("user_id", userId)
      .eq("verification_status", "confirmed")
      .in("action_id", [...actionIds]),
  ]);

  if (actionsResult.error) {
    throw new EngagementProofReadError("actions", actionsResult.error.message, {
      cause: actionsResult.error,
    });
  }
  if (!Array.isArray(actionsResult.data)) {
    throw new EngagementProofReadError("actions", "La lecture des actions est incomplète.");
  }
  if (attestationsResult.error) {
    throw new EngagementProofReadError(
      "actionRoleAttestations",
      attestationsResult.error.message,
      { cause: attestationsResult.error },
    );
  }
  if (!Array.isArray(attestationsResult.data)) {
    throw new EngagementProofReadError(
      "actionRoleAttestations",
      "La lecture des attestations de mission est incomplète.",
    );
  }

  return {
    actions: actionsResult.data as unknown as RawActionRow[],
    roleAttestations: attestationsResult.data as unknown as RawRoleAttestationRow[],
  };
}

async function loadSpogomiEquivalenceForOwner(
  supabase: SupabaseClient,
  userId: string,
  actionIds: readonly string[],
): Promise<{
  spogomiParticipants: RawSpogomiParticipantRow[];
  spogomiEvents: RawSpogomiEventRow[];
  spogomiAttestations: RawSpogomiAttestationRow[];
}> {
  if (actionIds.length === 0) {
    return { spogomiParticipants: [], spogomiEvents: [], spogomiAttestations: [] };
  }

  const participantsResult = await supabase
    .from("spogomi_participants")
    .select(
      "id, event_id, division_id, clerk_id, registration_status, attendance_status, account_link_status",
    )
    .eq("clerk_id", userId)
    .eq("account_link_status", "verified")
    .eq("attendance_status", "present");

  if (participantsResult.error) {
    throw new EngagementProofReadError(
      "spogomiEquivalence",
      participantsResult.error.message,
      { cause: participantsResult.error },
    );
  }
  const spogomiParticipants = (participantsResult.data ?? []) as RawSpogomiParticipantRow[];
  if (spogomiParticipants.length === 0) {
    return { spogomiParticipants: [], spogomiEvents: [], spogomiAttestations: [] };
  }

  const eventIds = [...new Set(spogomiParticipants.map((row) => row.event_id))];
  const participantIds = [...new Set(spogomiParticipants.map((row) => row.id))];

  const [eventsResult, attestationsResult] = await Promise.all([
    supabase
      .from("spogomi_events")
      .select("id, action_id, name, public_visibility, state")
      .in("id", eventIds)
      .in("action_id", [...actionIds]),
    supabase
      .from("spogomi_recognition_attestations")
      .select(
        "id, event_id, division_id, participant_id, kind, status, certified_at, evidence_reference, certification_version",
      )
      .in("event_id", eventIds)
      .in("participant_id", participantIds)
      .eq("status", "certified"),
  ]);

  if (eventsResult.error) {
    throw new EngagementProofReadError("spogomiEquivalence", eventsResult.error.message, {
      cause: eventsResult.error,
    });
  }
  if (attestationsResult.error) {
    throw new EngagementProofReadError(
      "spogomiEquivalence",
      attestationsResult.error.message,
      { cause: attestationsResult.error },
    );
  }

  return {
    spogomiParticipants,
    spogomiEvents: (eventsResult.data ?? []) as RawSpogomiEventRow[],
    spogomiAttestations: (attestationsResult.data ?? []) as RawSpogomiAttestationRow[],
  };
}

export async function loadPersonalEngagementProofProjection(
  supabase: SupabaseClient,
  userId: string,
  options: { now?: Date } = {},
): Promise<PersonalEngagementProofProjection> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    throw new EngagementProofReadError(
      "actionParticipants",
      "L’identifiant du compte est requis pour charger la projection des preuves.",
    );
  }

  try {
    const participantRows = await loadOwnerConfirmedParticipants(supabase, normalizedUserId);
    const actionIds = [
      ...deduplicateConfirmedParticipantsByActionId(participantRows, normalizedUserId).keys(),
    ];
    const [{ actions, roleAttestations }, spogomiSources] = await Promise.all([
      loadActionsAndAttestationsForActionIds(supabase, normalizedUserId, actionIds),
      loadSpogomiEquivalenceForOwner(supabase, normalizedUserId, actionIds),
    ]);

    return buildPersonalEngagementProofProjectionFromSources({
      userId: normalizedUserId,
      sources: {
        participantRows,
        actions,
        roleAttestations,
        ...spogomiSources,
      },
      now: options.now,
    });
  } catch (error) {
    if (error instanceof EngagementProofReadError) {
      return buildErrorEngagementProofProjection({
        userId: normalizedUserId,
        failedSource: error.failedSource,
        reason: error.message,
        now: options.now,
      });
    }
    return buildErrorEngagementProofProjection({
      userId: normalizedUserId,
      failedSource: "actionParticipants",
      reason: error instanceof Error ? error.message : "engagement_proof_projection_read_failed",
      now: options.now,
    });
  }
}
