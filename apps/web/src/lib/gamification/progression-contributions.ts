import {
  PROGRESSION_RULES_V1,
  type VerifiedContributionFamily,
} from "./progression-rules";
import type { ProgressionEventType } from "./progression-types";

export type VerifiedContributionEvent = {
  event_type: ProgressionEventType;
  status_phase: string;
  source_table: string | null;
  source_id: string | null;
  xp_awarded: number;
};

function buildActionFamilies(params: {
  validatedOrganizationActionIds: Iterable<string>;
  confirmedParticipantActionIds: Iterable<string>;
}): Map<string, VerifiedContributionFamily> {
  const actionFamilies = new Map<string, VerifiedContributionFamily>();
  for (const actionId of params.validatedOrganizationActionIds) {
    if (actionId) actionFamilies.set(actionId, "organisation");
  }
  for (const actionId of params.confirmedParticipantActionIds) {
    if (actionId && !actionFamilies.has(actionId)) {
      actionFamilies.set(actionId, "participation");
    }
  }
  return actionFamilies;
}

function resolveVerifiedEventFamily(
  event: VerifiedContributionEvent,
): VerifiedContributionFamily | null {
  if (event.event_type === "clean_zone_task" && event.source_table === "clean_zones") {
    return "clean_zones";
  }
  if (
    (event.event_type === "quiz_question_type_milestone" ||
      event.event_type === "quiz_question_type_balance_milestone") &&
    event.source_table === "quiz_type_progress"
  ) {
    return "learning";
  }
  if (
    event.event_type === "moderation_case_resolved" &&
    event.source_table === "admin_operations_audit"
  ) {
    return "moderation";
  }
  return null;
}

function addVerifiedEvent(
  event: VerifiedContributionEvent,
  contributionKeys: Set<string>,
  families: Set<VerifiedContributionFamily>,
): void {
  if (event.status_phase !== "validated" || !event.source_id) return;
  const family = resolveVerifiedEventFamily(event);
  if (!family) return;
  contributionKeys.add(`${family}:${event.source_id}`);
  families.add(family);
}

export function buildVerifiedContributionSummary(params: {
  validatedOrganizationActionIds: Iterable<string>;
  confirmedParticipantActionIds: Iterable<string>;
  events: readonly VerifiedContributionEvent[];
}): {
  count: number;
  families: VerifiedContributionFamily[];
} {
  const actionFamilies = buildActionFamilies(params);
  const contributionKeys = new Set<string>(
    [...actionFamilies.keys()].map((actionId) => `action:${actionId}`),
  );
  const families = new Set<VerifiedContributionFamily>(actionFamilies.values());

  for (const event of params.events) {
    addVerifiedEvent(event, contributionKeys, families);
  }

  return {
    count: contributionKeys.size,
    families: PROGRESSION_RULES_V1.verifiedContributionFamilies.filter((family) =>
      families.has(family),
    ),
  };
}
