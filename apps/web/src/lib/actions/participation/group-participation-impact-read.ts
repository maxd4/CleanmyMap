import type { SupabaseClient } from "@supabase/supabase-js";
import { runSingleActionQuery } from "@/lib/actions/query";
import {
  ACTION_PREVIEW_COLUMNS,
  ACTIVE_PARTICIPATION_STATUS,
  type ActionPreviewRow,
} from "./group-participation.helpers";
import {
  INDIVIDUAL_IMPACT_SELECT,
  allocateActionParticipantImpact,
  toIndividualImpactMeasurement,
  type ActionParticipantImpactAttribution,
} from "./individual-impact";

type ParticipantImpactRow = {
  id: string;
  updatedAt: string | null;
  participationStatus: string;
  measurement: ReturnType<typeof toIndividualImpactMeasurement>;
};

function groupParticipantImpactRows(
  data: unknown,
): Map<string, ParticipantImpactRow[]> {
  const rowsByActionId = new Map<string, ParticipantImpactRow[]>();
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const actionId = typeof row.action_id === "string" ? row.action_id : null;
    const id = typeof row.user_id === "string" ? row.user_id : null;
    if (!actionId || !id) continue;
    const rows = rowsByActionId.get(actionId) ?? [];
    rows.push({
      id,
      updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
      participationStatus: String(row.participation_status ?? "confirmed"),
      measurement: toIndividualImpactMeasurement(row),
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
    .select(`user_id, action_id, updated_at, participation_status, ${INDIVIDUAL_IMPACT_SELECT}`)
    .in("action_id", finalActionIds)
    .eq("participation_status", ACTIVE_PARTICIPATION_STATUS);
  if (result.error) return { ...empty, readStatus: "error" };
  const rowsByActionId = groupParticipantImpactRows(result.data);
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
    .sort();
  const revision = [action.updated_at ?? "", ...participantRevisions].join("|");
  return revision.length > 0 ? revision : null;
}

export async function loadParticipantImpactAttributions(
  supabase: SupabaseClient,
  actionById: Map<string, ActionPreviewRow>,
  finalActionIds: string[],
): Promise<Map<string, ReturnType<typeof allocateActionParticipantImpact>>> {
  return (await loadParticipantImpactProjection(supabase, actionById, finalActionIds))
    .attributionsByActionId;
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
      ? projection.attributionsByActionId.get(action.id) ?? new Map()
      : new Map(),
  };
}
