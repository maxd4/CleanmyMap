import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { loadActionOrganizerIdsForAction } from "@/lib/actions/organizers";
import { runSingleActionQuery } from "@/lib/actions/query";
import {
  extractActionMetadataFromNotes,
  setActionGroupJoinEnabledInNotes,
} from "@/lib/actions/metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const toggleSchema = z.object({
  groupJoinEnabled: z.boolean(),
});

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = toggleSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  const { actionId } = await ctx.params;
  const trimmedActionId = actionId.trim();
  if (!trimmedActionId) {
    return validationErrorResponse({
      actionId: ["Identifiant d'action manquant."],
    });
  }

  try {
    const supabase = getSupabaseServerClient();
    const actionResult = await runSingleActionQuery<{
      id: string;
      created_by_clerk_id: string | null;
      status: "pending" | "approved" | "rejected";
      notes: string | null;
    }>(supabase, (query) =>
      query.select("id, created_by_clerk_id, status, notes").eq("id", trimmedActionId).maybeSingle(),
    );

    if (!actionResult) {
      return NextResponse.json(
        { error: "Action introuvable." },
        { status: 404 },
      );
    }

    if (actionResult.status !== "approved") {
      return validationErrorResponse({
        actionId: [
          "Le formulaire ne peut être modifié qu'après validation.",
        ],
      });
    }

    const organizerIds = await loadActionOrganizerIdsForAction(
      supabase,
      trimmedActionId,
      actionResult.created_by_clerk_id ?? null,
    );

    if (!organizerIds.includes(userId)) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modifier ce formulaire." },
        { status: 403 },
      );
    }

    const updatedNotes = setActionGroupJoinEnabledInNotes(
      actionResult.notes,
      parsed.data.groupJoinEnabled,
    );

    const updateResult = await supabase
      .from("actions")
      .update({
        notes: updatedNotes,
      })
      .eq("id", trimmedActionId)
      .select("id, notes")
      .single();

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }

    const updatedMetadata = extractActionMetadataFromNotes(
      updateResult.data?.notes ?? updatedNotes,
    );

    return NextResponse.json({
      status: "ok",
      actionId: trimmedActionId,
      groupJoinEnabled: updatedMetadata.groupJoinEnabled,
    });
  } catch (error) {
    return handleApiError(error, "PATCH /api/actions/:actionId/group-join");
  }
}
