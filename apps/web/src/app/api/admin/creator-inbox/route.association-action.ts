import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadActionById } from "@/lib/actions/store";
import { decideAssociationActionReview, isAssociationActionReviewRequired } from "@/lib/actions/association-action-review";
import { emitAdministrativeRequirementNotifications } from "@/lib/actions/administrative-requirement-notifications";
import { buildAssociationActionReviewInboxItem, type CreatorInboxItem } from "@/lib/community/creator-inbox";
import type { CreatorInboxAction } from "./route.shared";

export async function handleCreatorInboxAssociationAction(params: {
  operationId: string;
  actorUserId: string;
  itemId: string;
  action: CreatorInboxAction["action"];
  reason: string;
}) {
  if (params.action !== "approve_association_action" && params.action !== "reject_association_action") {
    return NextResponse.json({ error: "Invalid association action decision." }, { status: 400 });
  }
  const supabase = getSupabaseServerClient(true);
  const current = await loadActionById(supabase, params.itemId);
  if (!current) return NextResponse.json({ error: "Action not found." }, { status: 404 });
  if (!isAssociationActionReviewRequired(current) || current.review_state !== "pending_review") {
    return NextResponse.json({ error: "This review is no longer pending.", code: "state_conflict" }, { status: 409 });
  }

  try {
    const decision = await decideAssociationActionReview({
      supabase,
      actionId: current.id,
      decision: params.action === "approve_association_action" ? "approve" : "reject",
      actorUserId: params.actorUserId,
      operationId: params.operationId,
      reason: params.reason,
      expectedReviewState: "pending_review",
      expectedUpdatedAt: current.updated_at ?? null,
    });
    if (decision.status === "conflict") {
      return NextResponse.json({ error: "La demande a changé ; rechargez la file.", code: "state_conflict" }, { status: 409 });
    }
    if (decision.status === "not_found") {
      return NextResponse.json({ error: "Action not found." }, { status: 404 });
    }
    if (decision.review_state === "approved") {
      await emitAdministrativeRequirementNotifications({ supabase, actionId: current.id });
    }
    const updated = await loadActionById(supabase, current.id);
    const item: CreatorInboxItem | undefined = updated
      ? buildAssociationActionReviewInboxItem({
          id: updated.id,
          created_at: updated.created_at,
          created_by_clerk_id: updated.created_by_clerk_id,
          actor_name: updated.actor_name,
          organizer_type: updated.organizer_type ?? null,
          organizer_name: updated.organizer_name ?? null,
          action_date: updated.action_date,
          event_start_time: updated.event_start_time ?? null,
          event_end_time: updated.event_end_time ?? null,
          location_label: updated.location_label,
          notes: updated.notes,
          review_state: updated.review_state ?? "not_required",
          review_reason: updated.review_reason ?? null,
          preparation_data: updated.preparation_data ?? null,
        }, updated.actor_name ?? "Membre")
      : undefined;
    return NextResponse.json({ status: "ok", reviewState: decision.review_state, item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to decide association action review." },
      { status: 500 },
    );
  }
}
