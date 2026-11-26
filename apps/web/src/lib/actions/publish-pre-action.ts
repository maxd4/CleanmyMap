import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionRow } from "@/types/database";
import { canPublishPreAction } from "@/lib/actions/publication";
import { initializeActionRouteVersioning } from "@/lib/actions/route-version-persistence";
import { emitAdministrativeRequirementNotifications } from "@/lib/actions/administrative-requirement-notifications";
import { validateActionFormalitiesForPublication } from "@/lib/actions/formalities/publication-validation";
import { isPublishedActionRow } from "@/lib/actions/runtime-contracts";
import { parseActionSingleRow, parseActionSupabaseResult } from "@/lib/actions/query";
import {
  isAssociationActionReviewRequired,
  submitAssociationActionReview,
} from "@/lib/actions/association-action-review";
import type { ActionFormalitiesFacts } from "@/lib/actions/formalities/qualification";
import type { ActionFormalitiesWorkflowState } from "@/lib/actions/formalities/workflow";

export type CanonicalPreActionPublicationResult =
  | { status: "published"; id: string; publishedAt: string; alreadyPublished: boolean; reviewState?: string }
  | { status: "pending_review"; id: string; reviewState: string }
  | { status: "terminal_state" }
  | { status: "not_publishable" }
  | { status: "formality_blocked"; blockedFormalityIds: string[] }
  | { status: "spontaneous_organizer_required" }
  | { status: "mandate_revoked" }
  | { status: "suppressed" }
  | { status: "conflict" };

function buildPublicationUpdate(params: {
  currentPreparationData: ActionRow["preparation_data"];
  publishedAt: string;
  userId: string;
  formalitiesContext: ActionFormalitiesFacts;
  formalitiesWorkflow: ActionFormalitiesWorkflowState;
}) {
  const preparationData = initializeActionRouteVersioning({
    preparationData: params.currentPreparationData,
    appliedAt: params.publishedAt,
    appliedByUserId: params.userId,
  });
  const nextPreparationData = {
    ...preparationData,
    formalitiesContext: params.formalitiesContext,
    formalitiesWorkflow: params.formalitiesWorkflow,
  };
  const shouldPersistPreparationData =
    !params.currentPreparationData?.routeVersioning ||
    JSON.stringify(params.currentPreparationData?.formalitiesContext) !==
      JSON.stringify(params.formalitiesContext) ||
    JSON.stringify(params.currentPreparationData?.formalitiesWorkflow) !==
      JSON.stringify(params.formalitiesWorkflow);
  return {
    published_at: params.publishedAt,
    ...(shouldPersistPreparationData
      ? { preparation_data: nextPreparationData }
      : {}),
  };
}

/**
 * Canonical pre-action publication workflow shared by HTTP /publish and admin external-sync.
 * Enforces terminal-state checks, formalities, association review, optimistic concurrency,
 * route versioning, and administrative requirement notifications.
 */
export async function publishPreActionCanonical(params: {
  supabase: SupabaseClient;
  current: ActionRow;
  actionId: string;
  userId: string;
  organizerIds: string[];
  persistPublication?: (update: {
    publishedAt: string;
    preparationData?: ActionRow["preparation_data"];
  }) => Promise<"published" | "conflict" | "mandate_revoked" | "suppressed">;
}): Promise<CanonicalPreActionPublicationResult> {
  const { supabase, current, actionId, userId, organizerIds, persistPublication } = params;

  if (current.status === "rejected" || current.status === "cancelled") {
    return { status: "terminal_state" };
  }

  if (isAssociationActionReviewRequired(current)) {
    const validation = await validateActionFormalitiesForPublication(current);
    if (!validation.ok) {
      return { status: "formality_blocked", blockedFormalityIds: validation.blockedFormalityIds };
    }
    if (current.published_at && current.review_state === "approved") {
      return {
        status: "published",
        id: current.id,
        publishedAt: current.published_at,
        alreadyPublished: true,
        reviewState: current.review_state,
      };
    }
    const review = await submitAssociationActionReview({
      supabase,
      actionId,
      actorUserId: userId,
      expectedUpdatedAt: current.updated_at ?? null,
    });
    if (review.status === "conflict") {
      return { status: "conflict" };
    }
    return {
      status: "pending_review",
      id: current.id,
      reviewState: review.review_state ?? "pending_review",
    };
  }

  if (current.published_at) {
    return {
      status: "published",
      id: current.id,
      publishedAt: current.published_at,
      alreadyPublished: true,
    };
  }

  if (!canPublishPreAction({ actionPhase: current.action_phase, publishedAt: null })) {
    return { status: "not_publishable" };
  }

  if (current.organizer_type === "spontaneous" && organizerIds.length === 0) {
    return { status: "spontaneous_organizer_required" };
  }

  const validation = await validateActionFormalitiesForPublication(current);
  if (!validation.ok) {
    return { status: "formality_blocked", blockedFormalityIds: validation.blockedFormalityIds };
  }

  const publishedAt = new Date().toISOString();
  const updatePayload = buildPublicationUpdate({
    currentPreparationData: current.preparation_data,
    publishedAt,
    userId,
    formalitiesContext: validation.formalitiesContext,
    formalitiesWorkflow: validation.formalitiesWorkflow,
  });

  if (persistPublication) {
    const persisted = await persistPublication({
      publishedAt,
      preparationData: updatePayload.preparation_data,
    });
    if (persisted !== "published") {
      return { status: persisted };
    }
    await emitAdministrativeRequirementNotifications({ supabase, actionId });
    return {
      status: "published",
      id: actionId,
      publishedAt,
      alreadyPublished: false,
    };
  }

  const rawResult: unknown = await supabase
    .from("actions")
    .update(updatePayload)
    .eq("id", actionId)
    .eq("updated_at", current.updated_at)
    .eq("created_by_clerk_id", current.created_by_clerk_id)
    .eq("action_phase", "pre_action")
    .is("published_at", null)
    .select("id, published_at")
    .maybeSingle();

  const result = parseActionSupabaseResult(rawResult);
  if (result.error) throw result.error;
  if (!result.data) return { status: "conflict" };

  const row = parseActionSingleRow(result.data, isPublishedActionRow);
  if (!row) throw new Error("La réponse de publication de l'action est invalide.");

  await emitAdministrativeRequirementNotifications({ supabase, actionId: row.id });
  return {
    status: "published",
    id: row.id,
    publishedAt: row.published_at ?? publishedAt,
    alreadyPublished: false,
  };
}
