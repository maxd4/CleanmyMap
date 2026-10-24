import { validateProposedTeamFormation } from "@/lib/spogomi/preparation";
import type { SpogomiRosterPreview } from "@/lib/spogomi/types";
import type { SpogomiTeamCompositionPreview } from "@/lib/spogomi/preparation-service";
import type { WorkspaceData } from "./spogomi-preparation-workspace-contract";

export type ImportSummary = { created: number; unchanged: number; changed: number; conflicts: number; excluded: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseWorkspaceData(value: unknown): WorkspaceData | null {
  if (!isRecord(value) || !isRecord(value.event) || !Array.isArray(value.divisions) || !Array.isArray(value.participants) || !Array.isArray(value.teams) || !Array.isArray(value.categoryRules) || !Array.isArray(value.eventAccess)) return null;
  return value as WorkspaceData;
}

export function parseRosterPreview(value: unknown): SpogomiRosterPreview | null {
  if (!isRecord(value) || typeof value.contentHash !== "string" || typeof value.importKey !== "string" || !isRecord(value.mapping) || !Array.isArray(value.rows) || !Array.isArray(value.errors)) return null;
  return value as SpogomiRosterPreview;
}

export function parseTeamPreview(value: unknown): SpogomiTeamCompositionPreview | null {
  if (!isRecord(value) || !isRecord(value.formation) || typeof value.proposalFingerprint !== "string" || typeof value.expectedRevision !== "number" || typeof value.participantCount !== "number" || typeof value.assignedParticipantCount !== "number" || !Array.isArray(value.preservedTeamIds) || !Array.isArray(value.explanation)) return null;
  return value as SpogomiTeamCompositionPreview;
}

export function countAssignedParticipants(data: WorkspaceData | null): number {
  return data?.participants.filter((participant) => participant.team_id).length ?? 0;
}

export function getValidRosterRows(preview: SpogomiRosterPreview | null): SpogomiRosterPreview["rows"] {
  if (!preview) return [];
  const invalidRows = new Set(preview.errors.map((item) => item.rowNumber));
  return preview.rows.filter((row) => !invalidRows.has(row.rowNumber));
}

const IMPORT_EFFECT_KEYS: Record<string, keyof ImportSummary> = {
  created: "created",
  unchanged: "unchanged",
  changed: "changed",
  conflict: "conflicts",
};

export function summarizeSelectedImport(acceptedRowNumbers: number[], preview: SpogomiRosterPreview | null): ImportSummary {
  const summary: ImportSummary = { created: 0, unchanged: 0, changed: 0, conflicts: 0, excluded: 0 };
  for (const rowNumber of acceptedRowNumbers) {
    const key = IMPORT_EFFECT_KEYS[preview?.rowEffects?.[String(rowNumber)] ?? ""] ?? "excluded";
    summary[key] += 1;
  }
  return summary;
}

function teamPreviewValidationInput(data: WorkspaceData, activeDivisionId: string | null, teamPreview: SpogomiTeamCompositionPreview) {
  const division = data.divisions.find((candidate) => candidate.id === activeDivisionId);
  const mode = division?.division_type ?? (data.event.mode === "mixed" ? "casual" : data.event.mode);
  const bounds = {
    minMembers: division?.team_size_config?.casual?.minMembers ?? data.event.team_size_config?.casual?.minMembers ?? null,
    maxMembers: division?.team_size_config?.casual?.maxMembers ?? data.event.team_size_config?.casual?.maxMembers ?? null,
  };
  return { formation: teamPreview.formation, participantIds: teamPreview.formation.teams.flatMap((team) => team.participantIds).concat(teamPreview.formation.unassignedParticipantIds), mode, casualTeamBounds: bounds };
}

export function validateTeamPreview(data: WorkspaceData | null, activeDivisionId: string | null, teamPreview: SpogomiTeamCompositionPreview | null): string | null {
  if (!data || !teamPreview) return null;
  try {
    validateProposedTeamFormation(teamPreviewValidationInput(data, activeDivisionId, teamPreview));
    return null;
  } catch (reason) {
    return reason instanceof Error ? reason.message : "La composition est invalide.";
  }
}
