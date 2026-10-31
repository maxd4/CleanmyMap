import { NextResponse } from "next/server";
import { canManageActionByRelation } from "@/lib/actions/permissions";
import { loadActionById } from "@/lib/actions/store";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionRow } from "@/types/database";

export async function loadRetrospectiveWriteContext(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  actionId: string,
  userId: string,
): Promise<Response | { action: ActionRow; organizerIds: string[] }> {
  const action = await loadActionById(supabase, actionId);
  if (!action) {
    return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
  }

  const organizerIds = await loadCanonicalActionOrganizerIdsForAction(supabase, actionId);
  if (!canManageActionByRelation(
    { userId },
    { createdByClerkId: action.created_by_clerk_id },
    organizerIds,
  )) {
    return NextResponse.json({ error: "Vous n'êtes pas autorisé à gérer ce retour d'expérience." }, { status: 403 });
  }

  if (action.action_phase !== "post_action_complete" || ["rejected", "cancelled"].includes(action.status)) {
    return NextResponse.json(
      { error: "Le retour d'expérience est réservé aux actions finalisées éligibles.", code: "retrospective_action_not_finalized" },
      { status: 422 },
    );
  }

  return { action, organizerIds };
}

export function retrospectiveOperationError(error: unknown): Response {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Forbidden") {
    return NextResponse.json({ error: "Vous n'êtes pas autorisé à gérer ce retour d'expérience." }, { status: 403 });
  }
  if (message.includes("requires content") || message.includes("not eligible") || message.includes("requires a finalized")) {
    return NextResponse.json({ error: "Cette action ne peut pas publier ce retour d'expérience.", code: "retrospective_not_publishable" }, { status: 422 });
  }
  if (message.includes("draft not found")) {
    return NextResponse.json({ error: "Enregistrez un brouillon avant de le publier.", code: "retrospective_draft_missing" }, { status: 409 });
  }
  return NextResponse.json({ error: "Le retour d'expérience est temporairement indisponible." }, { status: 500 });
}
