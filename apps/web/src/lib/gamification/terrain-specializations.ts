import type { ActionFieldRoleCode } from "@/lib/actions/field-roles";
import type { ActionRoleAttestationProvenance } from "@/lib/actions/role-attestations";
import type { CurrentInfiniteProgressionId } from "./progression-types";
import type { GamificationSourceFact } from "./gamification-reconstruction";

export const TERRAIN_SPECIALIZATION_RULES_VERSION = "terrain-specializations-2026.10-v1" as const;
export const TERRAIN_SPECIALIZATION_INTRODUCED_REVISION = 16 as const;
export const TERRAIN_SPECIALIZATION_EVENT_TYPE = "terrain_specialization_tier_unlock" as const;

export const TERRAIN_SPECIALIZATION_THRESHOLDS = [1, 3, 5, 10, 20] as const;

export type TerrainSpecializationId =
  | "organizer_primary"
  | "coorganizer"
  | "group_lead"
  | "cigarette_butts"
  | "recyclables"
  | "household_waste"
  | "glass";

export type TerrainSpecializationDefinition = {
  id: TerrainSpecializationId;
  roleCode: ActionFieldRoleCode;
  label: string;
  description: string;
  parentProgressionId: CurrentInfiniteProgressionId;
  badgeId: string;
  xpPerTier: number;
  sourceDomain: string;
};

export const TERRAIN_SPECIALIZATIONS = [
  {
    id: "organizer_primary",
    roleCode: "organizer_primary",
    label: "Organisateur référent",
    description: "Missions d’organisation effectivement exercées et attestées.",
    parentProgressionId: "organisation",
    badgeId: "terrain-specialization-organizer-primary",
    xpPerTier: 1,
    sourceDomain: "action_role_attestations.confirmed + action_organizers.is_primary + action_participants.confirmed",
  },
  {
    id: "coorganizer",
    roleCode: "coorganizer",
    label: "Coorganisateur",
    description: "Missions de coorganisation effectivement exercées et attestées.",
    parentProgressionId: "organisation",
    badgeId: "terrain-specialization-coorganizer",
    xpPerTier: 0.75,
    sourceDomain: "action_role_attestations.confirmed + action_organizers + action_participants.confirmed",
  },
  {
    id: "group_lead",
    roleCode: "group_lead",
    label: "Responsable de groupe",
    description: "Coordination du groupe et du déroulé terrain attestée après l’action.",
    parentProgressionId: "participation",
    badgeId: "terrain-specialization-group-lead",
    xpPerTier: 0.5,
    sourceDomain: "action_role_attestations.confirmed + action_participants.confirmed",
  },
  {
    id: "cigarette_butts",
    roleCode: "cigarette_bag_lead",
    label: "Responsable mégots",
    description: "Mission de suivi des mégots effectivement exercée et attestée.",
    parentProgressionId: "participation",
    badgeId: "terrain-specialization-cigarette-butts",
    xpPerTier: 0.4,
    sourceDomain: "action_role_attestations.confirmed + action_participants.confirmed",
  },
  {
    id: "recyclables",
    roleCode: "recyclable_bag_lead",
    label: "Responsable recyclables",
    description: "Mission de suivi des recyclables effectivement exercée et attestée.",
    parentProgressionId: "participation",
    badgeId: "terrain-specialization-recyclables",
    xpPerTier: 0.25,
    sourceDomain: "action_role_attestations.confirmed + action_participants.confirmed",
  },
  {
    id: "household_waste",
    roleCode: "household_waste_bag_lead",
    label: "Responsable ordures ménagères",
    description: "Mission de suivi des déchets ménagers effectivement exercée et attestée.",
    parentProgressionId: "participation",
    badgeId: "terrain-specialization-household-waste",
    xpPerTier: 0.25,
    sourceDomain: "action_role_attestations.confirmed + action_participants.confirmed",
  },
  {
    id: "glass",
    roleCode: "glass_bag_lead",
    label: "Responsable verre",
    description: "Mission de suivi du verre effectivement exercée et attestée.",
    parentProgressionId: "participation",
    badgeId: "terrain-specialization-glass",
    xpPerTier: 0.25,
    sourceDomain: "action_role_attestations.confirmed + action_participants.confirmed",
  },
] as const satisfies readonly TerrainSpecializationDefinition[];

export type TerrainSpecializationEvidence = {
  actionId: string;
  actionDate: string;
  actionCreatedAt: string;
  specializationId: TerrainSpecializationId;
  roleCode: ActionFieldRoleCode;
  attestationId: string;
  attestationRevision: number;
  provenance: ActionRoleAttestationProvenance;
};

export type TerrainSpecializationProgression = {
  id: TerrainSpecializationId;
  roleCode: ActionFieldRoleCode;
  label: string;
  description: string;
  parentProgressionId: CurrentInfiniteProgressionId;
  badgeId: string;
  verifiedActionCount: number;
  currentTier: number;
  nextThreshold: number;
  actionsRemaining: number;
  xpObtained: number;
  started: boolean;
};

function compareEvidence(left: TerrainSpecializationEvidence, right: TerrainSpecializationEvidence): number {
  return `${left.actionDate}:${left.actionId}:${left.roleCode}`.localeCompare(
    `${right.actionDate}:${right.actionId}:${right.roleCode}`,
  );
}

export function specializationThresholdForCount(count: number): number {
  const normalized = Math.max(0, Math.trunc(count));
  if (normalized < 1) return 1;
  if (normalized <= 20) {
    return [...TERRAIN_SPECIALIZATION_THRESHOLDS].reverse().find((threshold) => normalized >= threshold) ?? 1;
  }
  return 20 + Math.floor((normalized - 20) / 10) * 10;
}

export function nextTerrainSpecializationThreshold(count: number): number {
  const normalized = Math.max(0, Math.trunc(count));
  if (normalized < 1) return 1;
  if (normalized < 3) return 3;
  if (normalized < 5) return 5;
  if (normalized < 10) return 10;
  if (normalized < 20) return 20;
  return 20 + (Math.floor((normalized - 20) / 10) + 1) * 10;
}

export function thresholdsReachedByCount(count: number): number[] {
  const normalized = Math.max(0, Math.trunc(count));
  const thresholds: number[] = [...TERRAIN_SPECIALIZATION_THRESHOLDS].filter((threshold) => threshold <= normalized);
  for (let threshold = 30; threshold <= normalized; threshold += 10) thresholds.push(threshold);
  return thresholds;
}

function dedupeEvidence(evidence: readonly TerrainSpecializationEvidence[]): TerrainSpecializationEvidence[] {
  const unique = new Map<string, TerrainSpecializationEvidence>();
  for (const row of evidence) {
    const key = `${row.specializationId}:${row.actionId}`;
    if (!unique.has(key)) unique.set(key, row);
  }
  return [...unique.values()].sort(compareEvidence);
}

export function buildTerrainSpecializationFacts(
  userId: string,
  evidence: readonly TerrainSpecializationEvidence[],
): GamificationSourceFact[] {
  const bySpecialization = new Map<TerrainSpecializationId, TerrainSpecializationEvidence[]>();
  for (const row of dedupeEvidence(evidence)) {
    const rows = bySpecialization.get(row.specializationId) ?? [];
    rows.push(row);
    bySpecialization.set(row.specializationId, rows);
  }

  const candidates: Array<GamificationSourceFact & { specializationId: TerrainSpecializationId; actionId: string; xpCandidate: number }> = [];
  for (const definition of TERRAIN_SPECIALIZATIONS) {
    const rows = bySpecialization.get(definition.id) ?? [];
    rows.forEach((row, index) => {
      const count = index + 1;
      if (!thresholdsReachedByCount(count).includes(count)) return;
      const threshold = count;
      const sourceId = `terrain-specialization:${definition.id}:${TERRAIN_SPECIALIZATION_RULES_VERSION}:tier-${threshold}:action-${row.actionId}`;
      candidates.push({
        specializationId: definition.id,
        actionId: row.actionId,
        xpCandidate: definition.xpPerTier,
        mechanicId: `terrain_specialization:${definition.id}`,
        eventType: TERRAIN_SPECIALIZATION_EVENT_TYPE,
        sourceTable: "action_role_attestations",
        sourceId,
        occurredOn: row.actionDate || row.actionCreatedAt.slice(0, 10),
        xpAwarded: definition.xpPerTier,
        threshold,
        badgeId: definition.badgeId,
        metadata: {
          userId,
          actionId: row.actionId,
          roleCode: row.roleCode,
          specializationId: definition.id,
          specializationRulesVersion: TERRAIN_SPECIALIZATION_RULES_VERSION,
          attestationId: row.attestationId,
          attestationRevision: row.attestationRevision,
          responsibilityProvenance: row.provenance,
          verifiedActionCount: count,
        },
      });
    });
  }

  const candidatesByAction = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    const rows = candidatesByAction.get(candidate.actionId) ?? [];
    rows.push(candidate);
    candidatesByAction.set(candidate.actionId, rows);
  }
  for (const rows of candidatesByAction.values()) {
    const credited = [...rows].sort((left, right) =>
      right.xpCandidate - left.xpCandidate || left.specializationId.localeCompare(right.specializationId),
    )[0];
    for (const row of rows) {
      row.xpAwarded = row === credited ? row.xpCandidate : 0;
      row.metadata = {
        ...row.metadata,
        specializedXpCredited: row === credited,
        creditedSpecializationId: credited.specializationId,
      };
    }
  }
  return candidates;
}

export function buildTerrainSpecializationProgressions(
  evidence: readonly TerrainSpecializationEvidence[],
  specializedEvents: readonly { specializationId?: unknown; xp_awarded: number }[] = [],
): TerrainSpecializationProgression[] {
  const deduped = dedupeEvidence(evidence);
  return TERRAIN_SPECIALIZATIONS.map((definition) => {
    const verifiedActionCount = deduped.filter((row) => row.specializationId === definition.id).length;
    const currentTier = verifiedActionCount > 0 ? specializationThresholdForCount(verifiedActionCount) : 0;
    const xpObtained = specializedEvents
      .filter((event) => event.specializationId === definition.id)
      .reduce((sum, event) => sum + (Number(event.xp_awarded) || 0), 0);
    const nextThreshold = nextTerrainSpecializationThreshold(verifiedActionCount);
    return {
      id: definition.id,
      roleCode: definition.roleCode,
      label: definition.label,
      description: definition.description,
      parentProgressionId: definition.parentProgressionId,
      badgeId: definition.badgeId,
      verifiedActionCount,
      currentTier,
      nextThreshold,
      actionsRemaining: Math.max(0, nextThreshold - verifiedActionCount),
      xpObtained,
      started: verifiedActionCount > 0,
    };
  });
}
