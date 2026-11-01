import type { SupabaseClient } from "@supabase/supabase-js";
import { isActionRecord, runSingleActionQuery } from "@/lib/actions/query";
import {
  ACTION_PREVIEW_COLUMNS,
  ACTIVE_PARTICIPATION_STATUS,
  type ActionPreviewRow,
} from "./group-participation.helpers";
import {
  INDIVIDUAL_IMPACT_SELECT,
  allocateActionParticipantImpact,
  toIndividualImpactMeasurement,
  type IndividualImpactReadOptions,
  type ActionParticipantImpactAttribution,
} from "./individual-impact";

type ParticipantImpactRow = {
  id: string;
  updatedAt: string | null;
  participationStatus: string;
  measurement: ReturnType<typeof toIndividualImpactMeasurement>;
};

export class ParticipantImpactReadError extends Error {
  readonly code = "PARTICIPANT_IMPACT_READ_FAILED";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ParticipantImpactReadError";
  }
}

type ParticipantImpactProjectionOptions = IndividualImpactReadOptions & {
  strict?: boolean;
};

function groupParticipantImpactRows(
  data: unknown,
  options: IndividualImpactReadOptions = {},
): Map<string, ParticipantImpactRow[]> {
  const rowsByActionId = new Map<string, ParticipantImpactRow[]>();
  const candidates = Array.isArray(data) ? data : [];
  for (const candidate of candidates) {
    if (!isActionRecord(candidate)) continue;
    const row = candidate;
    const actionId = typeof row.action_id === "string" ? row.action_id : null;
    const id = typeof row.user_id === "string" ? row.user_id : null;
    if (!actionId || !id) continue;
    const rows = rowsByActionId.get(actionId) ?? [];
    rows.push({
      id,
      updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
      participationStatus: String(row.participation_status ?? "confirmed"),
      measurement: toIndividualImpactMeasurement(row, options),
    });
    rowsByActionId.set(actionId, rows);
  }
  return rowsByActionId;
}

function allocateParticipantImpactRows(
  actionById: Map<string, ActionPreviewRow>,
  actionIds: string[],
  rowsByActionId: Map<string, ParticipantImpactRow[]>,
): Map<string, ReturnType<typeof allocateActionParticipantImpact>> {
  const output = new Map<string, ReturnType<typeof allocateActionParticipantImpact>>();
  for (const actionId of actionIds) {
    const action = actionById.get(actionId);
    output.set(actionId, allocateActionParticipantImpact({
      totalWasteKg: action?.waste_kg ?? null,
      totalCigaretteButts: action?.cigarette_butts ?? null,
      participants: rowsByActionId.get(actionId) ?? [],
    }));
  }
  return output;
}

async function loadParticipantImpactProjection(
  supabase: SupabaseClient,
  actionById: Map<string, ActionPreviewRow>,
  finalActionIds: string[],
  options: ParticipantImpactProjectionOptions = {},
): Promise<{
  readStatus: "success" | "error";
  attributionsByActionId: Map<
    string,
    ReturnType<typeof allocateActionParticipantImpact>
  >;
  revisionByActionId: Map<string, string | null>;
}> {
  const empty = {
    readStatus: "success" as const,
    attributionsByActionId: new Map<string, ReturnType<typeof allocateActionParticipantImpact>>(),
    revisionByActionId: new Map<string, string | null>(),
  };
  if (finalActionIds.length === 0) return empty;
  const result = await supabase
    .from("action_participants")
    .select(`user_id, action_id, updated_at, participation_status, ${INDIVIDUAL_IMPACT_SELECT}`, { count: "exact" })
    .in("action_id", finalActionIds)
    .eq("participation_status", ACTIVE_PARTICIPATION_STATUS);
  if (result.error) {
    if (options.strict) {
      throw new ParticipantImpactReadError(result.error.message, { cause: result.error });
    }
    return { ...empty, readStatus: "error" };
  }
  if (!Array.isArray(result.data)) {
    if (options.strict) {
      throw new ParticipantImpactReadError("La projection des participations est incomplète.");
    }
    return { ...empty, readStatus: "error" };
  }
  if (typeof result.count === "number" && result.count !== result.data.length) {
    if (options.strict) {
      throw new ParticipantImpactReadError("La projection des participations est tronquée.");
    }
    return { ...empty, readStatus: "error" };
  }
  if (options.strict && result.data.some((candidate) => {
    if (!isActionRecord(candidate)) return true;
    return typeof candidate.action_id !== "string" || typeof candidate.user_id !== "string";
  })) {
    throw new ParticipantImpactReadError("La projection des participations contient une ligne invalide.");
  }
  const rowsByActionId = groupParticipantImpactRows(result.data, options);
  return {
    readStatus: "success",
    attributionsByActionId: allocateParticipantImpactRows(actionById, finalActionIds, rowsByActionId),
    revisionByActionId: new Map(
      finalActionIds.map((actionId) => [
        actionId,
        buildParticipantImpactRevision(actionById.get(actionId), rowsByActionId.get(actionId) ?? []),
      ]),
    ),
  };
}

function buildParticipantImpactRevision(
  action: ActionPreviewRow | undefined,
  rows: ParticipantImpactRow[],
): string | null {
  if (!action) return null;
  const participantRevisions = rows
    .map((row) => `${row.id}:${row.updatedAt ?? ""}`)
    .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  const revision = [action.updated_at ?? "", ...participantRevisions].join("|");
  return revision.length > 0 ? revision : null;
}

export async function loadParticipantImpactAttributions(
  supabase: SupabaseClient,
  actionById: Map<string, ActionPreviewRow>,
  finalActionIds: string[],
  options: IndividualImpactReadOptions = {},
): Promise<Map<string, ReturnType<typeof allocateActionParticipantImpact>>> {
  return (await loadParticipantImpactProjection(supabase, actionById, finalActionIds, options))
    .attributionsByActionId;
}

export async function loadStrictParticipantImpactAttributions(
  supabase: SupabaseClient,
  actionById: Map<string, ActionPreviewRow>,
  finalActionIds: string[],
  options: IndividualImpactReadOptions = {},
): Promise<Map<string, ReturnType<typeof allocateActionParticipantImpact>>> {
  return (await loadParticipantImpactProjection(supabase, actionById, finalActionIds, {
    ...options,
    strict: true,
  })).attributionsByActionId;
}

export type ActionParticipantImpactSnapshot = {
  available: boolean;
  readStatus: "available" | "unavailable" | "error";
  revision: string | null;
  attributions: Map<string, ActionParticipantImpactAttribution>;
};

export async function loadActionParticipantImpactSnapshot(
  supabase: SupabaseClient,
  actionId: string,
): Promise<ActionParticipantImpactSnapshot> {
  let action: ActionPreviewRow | null;
  try {
    action = await runSingleActionQuery<ActionPreviewRow>(supabase, (query) =>
      query.select(ACTION_PREVIEW_COLUMNS).eq("id", actionId).maybeSingle(),
    );
  } catch {
    return {
      available: false,
      readStatus: "error",
      revision: null,
      attributions: new Map(),
    };
  }
  const available = Boolean(
    action &&
      action.status === "approved" &&
      action.action_phase === "post_action_complete" &&
      action.published_at &&
      action.moderation_visibility !== "hidden",
  );
  if (!action || !available) {
    return {
      available: false,
      readStatus: "unavailable",
      revision: null,
      attributions: new Map(),
    };
  }
  const projection = await loadParticipantImpactProjection(
    supabase,
    new Map([[action.id, action]]),
    [action.id],
  );
  const availableProjection = projection.readStatus === "success";
  return {
    available: availableProjection,
    readStatus: availableProjection ? "available" : "error",
    revision: availableProjection
      ? projection.revisionByActionId.get(action.id) ?? null
      : null,
    attributions: availableProjection
      ? projection.attributionsByActionId.get(action.id) ?? new Map<string, ActionParticipantImpactAttribution>()
      : new Map<string, ActionParticipantImpactAttribution>(),
  };
}
