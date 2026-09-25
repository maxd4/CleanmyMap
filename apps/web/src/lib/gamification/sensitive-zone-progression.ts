import { areaFromLabel } from "@/lib/pilotage/overview.utils";
import type { ActionRow } from "./progression-types";
import {
  CANONICAL_GEM_GRADE_DEFINITIONS,
} from "./gem-progression";
import { SENSITIVE_ZONE_RULE_VERSION } from "./sensitive-zone-qualification";

export const SENSITIVE_ZONE_PROOF_EVENT_TYPE = "sensitive_zone_action" as const;
export const SENSITIVE_ZONE_MILESTONE_EVENT_TYPE =
  "sensitive_zone_milestone" as const;
export const SENSITIVE_ZONE_PROOF_SOURCE_TABLE = "sensitive_zone_actions" as const;
export const SENSITIVE_ZONE_MILESTONE_SOURCE_TABLE =
  "sensitive_zone_milestones" as const;

export type SensitiveZoneQualificationSnapshot = {
  actionId: string;
  qualified: boolean;
  area: string;
  ruleVersion: string;
  assessedAt: string;
  actionDate: string;
};

export type StoredSensitiveZoneQualification = {
  sourceId: string;
  snapshot: SensitiveZoneQualificationSnapshot;
};

export type SensitiveZoneProjectionState = {
  qualifications: StoredSensitiveZoneQualification[];
  milestoneThresholds: number[];
};

export type SensitiveZoneProjectionPlan = {
  qualificationsToInsert: SensitiveZoneQualificationSnapshot[];
  qualificationSourceIdsToRemove: string[];
  milestoneThresholdsToInsert: number[];
  milestoneThresholdsToRemove: number[];
  qualifiedActionCount: number;
};

export function buildSensitiveZoneQualificationSnapshot(
  action: Pick<ActionRow, "id" | "location_label" | "action_date" | "created_at">,
  sensitiveAreas: Iterable<string>,
  assessedAt: string,
): SensitiveZoneQualificationSnapshot {
  const area = areaFromLabel(action.location_label || "");
  const sensitiveAreaSet = new Set(
    [...sensitiveAreas]
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );

  return {
    actionId: action.id,
    qualified: sensitiveAreaSet.has(area),
    area,
    ruleVersion: SENSITIVE_ZONE_RULE_VERSION,
    assessedAt,
    actionDate: action.action_date || action.created_at,
  };
}

export function parseStoredSensitiveZoneQualification(
  sourceId: unknown,
  metadata: unknown,
): StoredSensitiveZoneQualification | null {
  if (
    typeof sourceId !== "string" ||
    !metadata ||
    typeof metadata !== "object"
  ) {
    return null;
  }

  const snapshot = (metadata as { sensitiveZone?: unknown }).sensitiveZone;
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  const candidate = snapshot as Partial<SensitiveZoneQualificationSnapshot>;
  if (
    typeof candidate.actionId !== "string" ||
    typeof candidate.qualified !== "boolean" ||
    typeof candidate.area !== "string" ||
    typeof candidate.ruleVersion !== "string" ||
    candidate.ruleVersion.trim().length === 0 ||
    typeof candidate.assessedAt !== "string" ||
    typeof candidate.actionDate !== "string"
  ) {
    return null;
  }

  return {
    sourceId,
    snapshot: {
      actionId: candidate.actionId,
      qualified: candidate.qualified,
      area: candidate.area,
      ruleVersion: candidate.ruleVersion,
      assessedAt: candidate.assessedAt,
      actionDate: candidate.actionDate,
    },
  };
}

export function sensitiveZoneMilestoneThresholds(maxCount: number): number[] {
  const safeCount = Math.max(0, Math.trunc(maxCount));
  const baseThresholds = CANONICAL_GEM_GRADE_DEFINITIONS
    .map((definition) => definition.threshold)
    .filter((threshold) => threshold > 0);
  const thresholds = [...baseThresholds];
  const lastBaseThreshold = thresholds.at(-1) ?? 0;

  for (
    let threshold = lastBaseThreshold + 5;
    threshold <= safeCount;
    threshold += 5
  ) {
    thresholds.push(threshold);
  }

  return thresholds.filter((threshold) => threshold <= safeCount);
}

export function planSensitiveZoneProjection(params: {
  actions: Pick<
    ActionRow,
    "id" | "location_label" | "action_date" | "created_at" | "status"
  >[];
  validatedActionIds: Set<string>;
  existing: SensitiveZoneProjectionState;
  sensitiveAreas: Iterable<string>;
  assessedAt: string;
}): SensitiveZoneProjectionPlan {
  const currentActionIds = new Set(params.actions.map((action) => action.id));
  const eligibleActionIds = new Set(
    params.actions
      .filter(
        (action) =>
          action.status === "approved" &&
          params.validatedActionIds.has(action.id),
      )
      .map((action) => action.id),
  );
  const existingByActionId = new Map(
    params.existing.qualifications.map((qualification) => [
      qualification.snapshot.actionId,
      qualification,
    ]),
  );

  const qualificationSourceIdsToRemove = params.existing.qualifications
    .filter(
      (qualification) =>
        currentActionIds.has(qualification.snapshot.actionId) &&
        !eligibleActionIds.has(qualification.snapshot.actionId),
    )
    .map((qualification) => qualification.sourceId);

  const qualificationsToInsert = params.actions
    .filter(
      (action) =>
        eligibleActionIds.has(action.id) && !existingByActionId.has(action.id),
    )
    .map((action) =>
      buildSensitiveZoneQualificationSnapshot(
        action,
        params.sensitiveAreas,
        params.assessedAt,
      ),
    );

  const removedActionIds = new Set(
    params.existing.qualifications
      .filter((qualification) =>
        qualificationSourceIdsToRemove.includes(qualification.sourceId),
      )
      .map((qualification) => qualification.snapshot.actionId),
  );
  const finalQualifications = [
    ...new Map(
      [
        ...params.existing.qualifications.filter(
          (qualification) =>
            !removedActionIds.has(qualification.snapshot.actionId),
        ),
        ...qualificationsToInsert.map((snapshot) => ({
          sourceId: snapshot.actionId,
          snapshot,
        })),
      ].map((qualification) => [qualification.snapshot.actionId, qualification]),
    ).values(),
  ];
  const qualifiedActionCount = finalQualifications.filter(
    (qualification) => qualification.snapshot.qualified,
  ).length;
  const desiredMilestoneThresholds = new Set(
    sensitiveZoneMilestoneThresholds(qualifiedActionCount),
  );
  const existingMilestoneThresholds = new Set(
    params.existing.milestoneThresholds,
  );

  return {
    qualificationsToInsert,
    qualificationSourceIdsToRemove,
    milestoneThresholdsToInsert: [...desiredMilestoneThresholds].filter(
      (threshold) => !existingMilestoneThresholds.has(threshold),
    ),
    milestoneThresholdsToRemove: [...existingMilestoneThresholds].filter(
      (threshold) => !desiredMilestoneThresholds.has(threshold),
    ),
    qualifiedActionCount,
  };
}
