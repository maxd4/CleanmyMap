import { NextResponse } from "next/server";
import { getCurrentUserIdentity, requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadActionById } from "@/lib/actions/store";
import {
  canValidateActionAdministrativeRequirements,
} from "@/lib/actions/permissions";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import {
  normalizeAdministrativeRequirements,
} from "@/lib/actions/administrative-requirements";
import { appendActionModerationAudit } from "@/lib/actions/moderation-audit";

export const runtime = "nodejs";
// Justification Vercel: la validation dépend de l'identité, de la relation organisateur et de l'état frais de l'action.
export const dynamic = "force-dynamic";

function responseFor(
  actionId: string,
  validatedAt: string,
) {
  return NextResponse.json({
    status: "ok",
    actionId,
    administrativeRequirements: {
      status: "validated",
      validatedAt,
    },
  });
}

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  const { actionId } = await ctx.params;
  const trimmedActionId = actionId.trim();
  if (!trimmedActionId) {
    return validationErrorResponse({ actionId: ["Identifiant d'action manquant."] });
  }

  try {
    const supabase = getSupabaseServerClient();
    const current = await loadActionById(supabase, trimmedActionId);
    if (!current) {
      return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
    }
    if (current.action_phase !== "pre_action") {
      return NextResponse.json(
        { error: "Les démarches administratives concernent uniquement une pré-action.", code: "state_conflict" },
        { status: 409 },
      );
    }

    const identity = await getCurrentUserIdentity();
    const permissionIdentity = identity
      ? { userId: access.userId, activeRole: identity.activeRole }
      : null;
    const organizerIds = await loadCanonicalActionOrganizerIdsForAction(
      supabase,
      trimmedActionId,
    );
    if (
      !canValidateActionAdministrativeRequirements(
        permissionIdentity,
        { createdByClerkId: current.created_by_clerk_id, actionPhase: current.action_phase },
        organizerIds,
      )
    ) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à valider les démarches administratives." },
        { status: 403 },
      );
    }

    const existing = normalizeAdministrativeRequirements(
      current.preparation_data?.administrativeRequirements,
    );
    if (existing.status === "validated") {
      return responseFor(trimmedActionId, existing.validatedAt ?? current.updated_at ?? new Date().toISOString());
    }

    const validatedAt = new Date().toISOString();
    const nextPreparationData = {
      ...(current.preparation_data ?? {}),
      administrativeRequirements: {
        status: "validated" as const,
        validatedAt,
        validatedByUserId: access.userId,
      },
    };
    const statusPath = "preparation_data->administrativeRequirements->>status";
    let updateQuery = supabase
      .from("actions")
      .update({ preparation_data: nextPreparationData })
      .eq("id", trimmedActionId)
      .eq("action_phase", "pre_action");
    updateQuery = current.preparation_data?.administrativeRequirements
      ? updateQuery.eq(statusPath, "pending")
      : updateQuery.is(statusPath, null);
    const updated = await updateQuery.select("id").maybeSingle();
    if (updated.error) {
      throw new Error(updated.error.message);
    }

    if (!updated.data) {
      const afterRace = await loadActionById(supabase, trimmedActionId);
      const afterRaceRequirements = normalizeAdministrativeRequirements(
        afterRace?.preparation_data?.administrativeRequirements,
      );
      if (afterRaceRequirements.status === "validated") {
        return responseFor(
          trimmedActionId,
          afterRaceRequirements.validatedAt ?? validatedAt,
        );
      }
      return NextResponse.json(
        { error: "La validation des démarches n'a pas pu être appliquée.", code: "state_conflict" },
        { status: 409 },
      );
    }

    await appendActionModerationAudit({
      operationId: `action-administrative-requirements-${trimmedActionId}`,
      actorUserId: access.userId,
      targetActionId: trimmedActionId,
      operation: "validate_administrative_requirements",
      outcome: "success",
      previousValue: { status: "pending" },
      newValue: { status: "validated" },
      details: {
        actionId: trimmedActionId,
        validatedAt,
        validatedByUserId: access.userId,
        previousStatus: "pending",
        newStatus: "validated",
      },
    });

    return responseFor(trimmedActionId, validatedAt);
  } catch (error) {
    return handleApiError(error, "POST /api/actions/:actionId/administrative-requirements");
  }
}
