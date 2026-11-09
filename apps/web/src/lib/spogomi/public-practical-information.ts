import type { ActionPreparationData } from "@/lib/actions/types";
import { buildPublicActionPracticalInformation } from "@/lib/actions/participation/group-participation-public-projection";

export type SpogomiPublicSchedule = {
  divisionId: string;
  divisionType: "casual" | "world_cup";
  timezoneName: string;
  officialStartAt: string;
  collectionLimitAt: string;
  sortingLimitAt: string;
  weighingStartAt: string;
  weighingEndAt: string;
};

export type SpogomiPublicPracticalInformation = {
  meetingPoint: string | null;
  collectionZone: string | null;
  unfoldingMessage: string | null;
  recommendedMaterials: string[];
  materialsProvided: string[];
  safetyInstructions: string | null;
  organizationContact: string | null;
  assistanceProcedure: string | null;
  schedules: SpogomiPublicSchedule[];
};

type PublicDivision = {
  id: string;
  type: "casual" | "world_cup";
};

type PublicOperation = {
  division_id: string;
  timezone_name: string;
  official_start_at: string | null;
  collection_limit_at: string | null;
  sorting_limit_at: string | null;
  weighing_start_at: string | null;
  weighing_end_at: string | null;
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function registrationPolicy(value: unknown): Record<string, unknown> {
  return isRecord(value) && isRecord(value.registrationPolicy) ? value.registrationPolicy : {};
}

function verifiedPolicyText(policy: Record<string, unknown>, field: string, verificationField: string): string | null {
  return policy[verificationField] === true ? text(policy[field]) : null;
}

function validTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function completeSchedule(operation: PublicOperation, division: PublicDivision): SpogomiPublicSchedule | null {
  if (!validTimeZone(operation.timezone_name)) return null;
  const values = [
    operation.official_start_at,
    operation.collection_limit_at,
    operation.sorting_limit_at,
    operation.weighing_start_at,
    operation.weighing_end_at,
  ];
  if (values.some((value) => !value)) return null;
  return {
    divisionId: division.id,
    divisionType: division.type,
    timezoneName: operation.timezone_name,
    officialStartAt: operation.official_start_at!,
    collectionLimitAt: operation.collection_limit_at!,
    sortingLimitAt: operation.sorting_limit_at!,
    weighingStartAt: operation.weighing_start_at!,
    weighingEndAt: operation.weighing_end_at!,
  };
}

function uniqueTexts(values: readonly (string | null | undefined)[]): string[] {
  return [...new Set(values.map((value) => text(value)).filter((value): value is string => Boolean(value)))];
}

export function buildSpogomiPublicPracticalInformation(params: {
  actionPreparationData?: ActionPreparationData | null;
  registrationConfig?: unknown;
  divisions: readonly PublicDivision[];
  operations: readonly PublicOperation[];
}): SpogomiPublicPracticalInformation {
  const preparation = params.actionPreparationData ?? undefined;
  const actionInfo = buildPublicActionPracticalInformation(preparation);
  const policy = registrationPolicy(params.registrationConfig);
  const divisionById = new Map(params.divisions.map((division) => [division.id, division]));
  const schedules = params.operations.flatMap((operation) => {
    const division = divisionById.get(String(operation.division_id));
    const schedule = division ? completeSchedule(operation, division) : null;
    return schedule ? [schedule] : [];
  });

  return {
    meetingPoint: text(preparation?.pointDeRendezVous),
    collectionZone: text(preparation?.zoneCiblePrevue),
    unfoldingMessage: actionInfo.participantMessage,
    recommendedMaterials: uniqueTexts([
      actionInfo.materialsToBring,
      ...(actionInfo.suggestedMaterials ?? []),
      ...actionInfo.derivedMaterials,
    ]),
    materialsProvided: uniqueTexts([
      actionInfo.materialsProvided,
      ...actionInfo.equipmentProvided,
    ]),
    safetyInstructions: verifiedPolicyText(policy, "safetyInstructions", "safetyInstructionsVerified") ?? actionInfo.safetyInstructions,
    organizationContact: verifiedPolicyText(policy, "organizationContact", "organizationContactVerified"),
    assistanceProcedure: verifiedPolicyText(policy, "assistanceProcedure", "assistanceProcedureVerified"),
    schedules,
  };
}
