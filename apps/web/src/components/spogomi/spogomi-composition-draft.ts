import type { WorkspaceData } from "./spogomi-preparation-workspace-contract";

export type DraftTeam = WorkspaceData["teams"][number] & { clientKey?: string; basePublicName?: string };
export type DraftParticipant = WorkspaceData["participants"][number] & { clientKey?: string };

export type SpogomiCompositionDraft = {
  divisionId: string;
  baseRevision: number;
  teams: DraftTeam[];
  participants: DraftParticipant[];
};

export type SpogomiCompositionDraftPayload = {
  divisionId: string;
  expectedRevision: number;
  teams: Array<{ id: string | null; clientKey: string | null; publicName: string; expectedPublicName: string | null }>;
  participants: Array<{ id: string | null; clientKey: string | null; privateLabel: string | null; teamKey: string | null }>;
};

export function createSpogomiCompositionDraft(data: WorkspaceData, divisionId: string): SpogomiCompositionDraft {
  return {
    divisionId,
    baseRevision: data.event.composition_revision ?? 0,
    teams: data.teams.filter((team) => team.division_id === divisionId).map((team) => ({ ...team, basePublicName: team.public_name })),
    participants: data.participants.filter((participant) => participant.division_id === divisionId),
  };
}

export function applySpogomiCompositionDraft(data: WorkspaceData, draft: SpogomiCompositionDraft): WorkspaceData {
  return {
    ...data,
    teams: [...data.teams.filter((team) => team.division_id !== draft.divisionId), ...draft.teams],
    participants: [...data.participants.filter((participant) => participant.division_id !== draft.divisionId), ...draft.participants],
  };
}

export function isSpogomiCompositionDraftDirty(data: WorkspaceData, draft: SpogomiCompositionDraft): boolean {
  const serverTeams = data.teams.filter((team) => team.division_id === draft.divisionId);
  const serverParticipants = data.participants.filter((participant) => participant.division_id === draft.divisionId);
  if (serverTeams.length !== draft.teams.length || serverParticipants.length !== draft.participants.length) return true;
  return draft.teams.some((team) => {
    const serverTeam = serverTeams.find((candidate) => candidate.id === team.id);
    return !serverTeam || serverTeam.public_name !== team.public_name || serverTeam.team_number !== team.team_number;
  }) || draft.participants.some((participant) => {
    const serverParticipant = serverParticipants.find((candidate) => candidate.id === participant.id);
    return !serverParticipant || serverParticipant.display_name !== participant.display_name || serverParticipant.team_id !== participant.team_id;
  });
}

export function serializeSpogomiCompositionDraft(draft: SpogomiCompositionDraft): SpogomiCompositionDraftPayload {
  return {
    divisionId: draft.divisionId,
    expectedRevision: draft.baseRevision,
    teams: draft.teams.map((team) => ({ id: team.clientKey ? null : team.id, clientKey: team.clientKey ?? null, publicName: team.public_name, expectedPublicName: team.clientKey ? null : team.basePublicName ?? team.public_name })),
    participants: draft.participants.map((participant) => ({
      id: participant.clientKey ? null : participant.id,
      clientKey: participant.clientKey ?? null,
      privateLabel: participant.display_name,
      teamKey: participant.team_id,
    })),
  };
}
