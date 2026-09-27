import { canViewActionModerationAudit } from "@/lib/actions/permissions";
import type { UserIdentity } from "@/lib/authz";
import { computeModerationProgress } from "./gem-progression";
import { CURRENT_INFINITE_PROGRESSIONS, toIsoDate } from "./progression-utils";
import type { GamificationProgressionState, ProgressionEventType } from "./progression-types";

export type ModerationAuditRow = {
  operation_id: string | null;
  at: string | null;
  actor_user_id: string | null;
  operation_type: string | null;
  outcome: string | null;
  target_id: string | null;
  details: unknown;
};

type ModerationCaseFamily = "action" | "participation" | "clean_place";

export type ResolvedModerationCase = {
  caseId: string;
  family: ModerationCaseFamily;
  targetId: string;
  operation: string;
  auditOperationId: string | null;
  occurredOn: string;
};

export const DERIVED_MODERATION_EVENT_TYPES: readonly ProgressionEventType[] = [
  "moderation_case_resolved",
  "moderation_tier_unlock",
  "moderation_first_case",
  "moderation_first_participation",
  "moderation_first_impact_correction",
  "moderation_multi_family",
];

export const RESOLVED_MODERATION_CASE_SOURCE = "admin_operations_audit";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function status(value: unknown): string | null {
  return nonEmptyString(value)?.toLowerCase() ?? null;
}

function isAutomatic(details: Record<string, unknown>): boolean {
  return details.automatic === true || details.auto === true;
}

function isActorOwnData(details: Record<string, unknown>, actorUserId: string): boolean {
  const targetUserId = nonEmptyString(details.targetUserId);
  return targetUserId !== null && targetUserId === actorUserId;
}

function resolveActionCase(
  row: ModerationAuditRow,
  details: Record<string, unknown>,
  targetId: string,
): ResolvedModerationCase | null {
  if (status(details.entityType) !== "action") return null;

  const operation = nonEmptyString(details.operation) ?? "action_decision";
  const reason = nonEmptyString(details.reason);
  const previousValue = asRecord(details.previousValue);
  const targetStatus = status(details.targetStatus);
  const isFinalDecision =
    status(previousValue?.status) === "pending" &&
    (targetStatus === "approved" || targetStatus === "rejected");
  const isJustifiedImpactCorrection =
    operation === "correct_impact" && reason !== null && reason.length >= 5;

  if (!isFinalDecision && !isJustifiedImpactCorrection) return null;
  return {
    caseId: `action:${targetId}`,
    family: "action",
    targetId,
    operation,
    auditOperationId: nonEmptyString(row.operation_id),
    occurredOn: toIsoDate(row.at),
  };
}

function resolveParticipationCase(
  row: ModerationAuditRow,
  details: Record<string, unknown>,
  targetId: string,
): ResolvedModerationCase | null {
  const operation = nonEmptyString(details.operation);
  const participantUserId = nonEmptyString(details.participantUserId);
  if (!operation || !participantUserId) return null;

  const isDecision = [
    "post_action_claim_review",
    "admin_review_accept",
    "admin_review_reject",
    "admin_add_participant",
    "admin_remove_participant",
  ].includes(operation);
  if (!isDecision) return null;

  if (
    operation === "post_action_claim_review" &&
    nonEmptyString(details.participationSource) !== "post_action_claim"
  ) {
    return null;
  }

  const decision = status(details.decision);
  if (
    (operation === "post_action_claim_review" ||
      operation === "admin_review_accept" ||
      operation === "admin_review_reject") &&
    decision !== "accept" &&
    decision !== "reject"
  ) {
    return null;
  }

  return {
    caseId: `participation:${targetId}:${participantUserId}`,
    family: "participation",
    targetId,
    operation,
    auditOperationId: nonEmptyString(row.operation_id),
    occurredOn: toIsoDate(row.at),
  };
}

function resolveCleanPlaceCase(
  row: ModerationAuditRow,
  details: Record<string, unknown>,
  targetId: string,
): ResolvedModerationCase | null {
  if (status(details.entityType) !== "clean_place") return null;
  const previousValue = asRecord(details.previousValue);
  const newValue = asRecord(details.newValue);
  const previousStatus = status(previousValue?.status);
  const newStatus = status(newValue?.status);
  if (
    previousStatus !== "new" ||
    (newStatus !== "validated" && newStatus !== "cleaned")
  ) {
    return null;
  }

  return {
    caseId: `clean_place:${nonEmptyString(details.sourceTable) ?? "trash_spotter_spots"}:${targetId}`,
    family: "clean_place",
    targetId,
    operation: "clean_place_validation",
    auditOperationId: nonEmptyString(row.operation_id),
    occurredOn: toIsoDate(row.at),
  };
}

export function resolveModerationCaseFromAudit(
  row: ModerationAuditRow,
  actorUserId: string,
): ResolvedModerationCase | null {
  if (
    nonEmptyString(row.actor_user_id) !== actorUserId ||
    status(row.operation_type) !== "moderation" ||
    status(row.outcome) !== "success"
  ) {
    return null;
  }

  const targetId = nonEmptyString(row.target_id);
  const details = asRecord(row.details);
  if (!targetId || !details || isAutomatic(details) || isActorOwnData(details, actorUserId)) {
    return null;
  }

  return (
    resolveActionCase(row, details, targetId) ??
    resolveParticipationCase(row, details, targetId) ??
    resolveCleanPlaceCase(row, details, targetId)
  );
}

export function deriveResolvedModerationCases(
  rows: readonly ModerationAuditRow[],
  actorUserId: string,
): ResolvedModerationCase[] {
  const unique = new Map<string, ResolvedModerationCase>();
  for (const row of rows) {
    const resolved = resolveModerationCaseFromAudit(row, actorUserId);
    if (resolved && !unique.has(resolved.caseId)) unique.set(resolved.caseId, resolved);
  }
  return [...unique.values()].sort((left, right) =>
    left.occurredOn.localeCompare(right.occurredOn) || left.caseId.localeCompare(right.caseId),
  );
}

export function canViewModerationProgression(
  identity: Pick<UserIdentity, "userId" | "activeRole"> | null | undefined,
  profileUserId: string,
): boolean {
  return identity?.userId === profileUserId && canViewActionModerationAudit(identity);
}

function countModerationThresholdAwards(current: number): number {
  const safeCurrent = Math.max(0, Math.trunc(current));
  const baseAwards = [1, 3, 5, 8, 10, 15, 20].filter(
    (threshold) => safeCurrent >= threshold,
  ).length;
  return baseAwards + (safeCurrent >= 25 ? Math.floor((safeCurrent - 25) / 5) + 1 : 0);
}

export function buildModerationProgressionState(
  resolvedModerationCases: number,
): GamificationProgressionState {
  const definition = CURRENT_INFINITE_PROGRESSIONS.find(
    (progression) => progression.id === "moderation",
  );
  if (!definition) throw new Error("La progression Modération CURRENT est absente.");

  const progression = computeModerationProgress(resolvedModerationCases);
  return {
    ...definition,
    currentValue: Math.max(0, Math.trunc(resolvedModerationCases)),
    currentBadge: { id: progression.currentGrade.id, label: progression.currentLabel },
    nextBadge: progression.nextGrade
      ? { id: progression.nextGrade.id, label: progression.nextLabel ?? progression.nextGrade.label }
      : null,
    progressPercent: progression.progressPercent,
    xpContribution: countModerationThresholdAwards(resolvedModerationCases),
  };
}
