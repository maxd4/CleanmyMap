import "server-only";

import { createHash } from "node:crypto";
import type { SpogomiTeamFormation } from "./types";

export function teamCompositionFingerprint(input: {
  event: { id: string; mode: string; team_size_config: unknown; composition_revision?: number };
  participants: Array<{ id: string; sourceOrder: number; groupPreference: string | null; teamId: string | null; registrationStatus: string }>;
  teams: Array<{ id: string; teamNumber: number; compositionState: string }>;
  formation: SpogomiTeamFormation;
}) {
  return createHash("sha256").update(JSON.stringify({
    eventId: input.event.id,
    revision: input.event.composition_revision ?? 0,
    mode: input.event.mode,
    teamSizeConfig: input.event.team_size_config,
    participants: input.participants.map(({ id, sourceOrder, groupPreference, teamId, registrationStatus }) => ({ id, sourceOrder, groupPreference, teamId, registrationStatus })),
    teams: input.teams.map(({ id, teamNumber, compositionState }) => ({ id, teamNumber, compositionState })),
    formation: input.formation,
  })).digest("hex");
}
