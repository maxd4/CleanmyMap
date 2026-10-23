import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPostActionRetentionLoop } from "@/lib/gamification/progression";
import type { CreateActionPayload } from "@/lib/actions/types";
import { loadActionById } from "@/lib/actions/store";
import { invalidatePublicSurfaceSnapshotsByRoute } from "@/lib/public-surface-snapshots";
import { logFailure } from "@/lib/logging/failure-log";
import { resolveActionTerritory } from "@/lib/geo/action-territory-resolver";
import { actionFormalitiesFactsSchema, deriveActionFormalitiesFacts } from "@/lib/actions/formalities-facts";
import { qualifyActionFormalities } from "@/lib/actions/formalities-qualification";
import { buildFormalitiesWorkflowState } from "@/lib/actions/formalities-workflow";
import { buildFormalitiesTerritoryFingerprint } from "@/lib/actions/formalities-rules";

function buildInitialFormalitiesState(payload: CreateActionPayload) {
  return resolveActionTerritory({
    latitude: payload.latitude,
    longitude: payload.longitude,
    geometry: null,
    departmentCode: payload.departmentCode,
    departmentName: payload.departmentName,
  }).then((resolvedTerritory) => {
    const fallbackFacts = deriveActionFormalitiesFacts({
      departmentCode: payload.departmentCode,
      departmentName: payload.departmentName,
      resolvedTerritory,
      placeType: payload.placeType,
      plannedObjective: payload.preparationData?.plannedObjective,
    });
    const providedFacts = actionFormalitiesFactsSchema.safeParse(payload.preparationData?.formalitiesContext);
    const facts = providedFacts.success
      ? {
        ...providedFacts.data,
        territory: resolvedTerritory || fallbackFacts.territory.code !== "FR-unknown"
          ? fallbackFacts.territory
          : providedFacts.data.territory,
      }
      : fallbackFacts;
    const qualification = qualifyActionFormalities(facts);
    const workflow = buildFormalitiesWorkflowState({
      facts,
      qualification,
      actionDependencies: {
        locationLabel: payload.locationLabel,
        actionDate: payload.actionDate,
        territoryFingerprint: buildFormalitiesTerritoryFingerprint(facts.territory),
      },
    });
    return { facts, workflow };
  });
}

export async function persistInitialFormalities(params: {
  supabase: SupabaseClient;
  actionId: string;
  payload: CreateActionPayload;
}): Promise<void> {
  try {
    const { facts, workflow } = await buildInitialFormalitiesState(params.payload);
    if (typeof (params.supabase as unknown as { from?: unknown }).from !== "function") return;
    const current = await loadActionById(params.supabase, params.actionId);
    const result = await params.supabase
      .from("actions")
      .update({
        preparation_data: {
          ...(current?.preparation_data ?? params.payload.preparationData ?? {}),
          formalitiesContext: facts,
          formalitiesWorkflow: workflow,
        },
      })
      .eq("id", params.actionId);
    if (result.error) throw result.error;
  } catch (error) {
    logFailure("Actions/Create", "Initial formalities qualification persistence failed", error, { actionId: params.actionId });
  }
}

export async function invalidateActionSnapshots(actionId: string): Promise<void> {
  try {
    await invalidatePublicSurfaceSnapshotsByRoute(["api/actions", "api/actions/map"]);
  } catch (error) {
    logFailure("Actions/Create", "Public action map snapshot invalidation failed", error, { actionId });
  }
}

export async function buildActionRetentionLoop(supabase: SupabaseClient, userId: string, actionId: string) {
  return buildPostActionRetentionLoop(supabase, { userId, actionId }).catch((error) => {
    logFailure("Actions/Create", "Post-action retention loop failed", error, { actionId, userId });
    return null;
  });
}
