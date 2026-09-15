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
import { isPublishedFuturePreAction } from "@/lib/actions/temporal";
import { normalizeAdministrativeRequirements } from "@/lib/actions/administrative-requirements";

export const runtime = "nodejs";
// Justification Vercel: la validation dépend de l'identité, de la relation organisateur et de l'état frais de l'action.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const { actionId } = await ctx.params;
  const trimmedActionId = actionId.trim();
  if (!trimmedActionId) {
    return validationErrorResponse({ actionId: ["Identifiant d'action manquant."] });
  }

  try {
    const supabase = getSupabaseServerClient(true);
    const current = await loadActionById(supabase, trimmedActionId);
    if (!current || current.action_phase !== "pre_action") {
      return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
    }

    const identity = await getCurrentUserIdentity();
    const organizerIds = await loadCanonicalActionOrganizerIdsForAction(
      supabase,
      trimmedActionId,
    );
    const canValidate = canValidateActionAdministrativeRequirements(
      identity
        ? { userId: identity.userId, activeRole: identity.activeRole }
        : null,
      { createdByClerkId: current.created_by_clerk_id, actionPhase: current.action_phase },
      organizerIds,
    );
    if (!canValidate && !isPublishedFuturePreAction(current)) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à lire l'état de cette pré-action." },
        { status: 403 },
      );
    }

    const requirements = normalizeAdministrativeRequirements(
      current.preparation_data?.administrativeRequirements,
    );
    return NextResponse.json({
      status: requirements.status,
      validatedAt: requirements.validatedAt ?? null,
      canValidate,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/:actionId/administrative-requirements");
  }
}

function responseFor(
  actionId: string,
  validatedAt: string | null,
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
    const supabase = getSupabaseServerClient(true);
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

    const result = await supabase.rpc("validate_action_administrative_requirements", {
      p_action_id: trimmedActionId,
      p_validated_by_user_id: access.userId,
    });
    if (result.error) {
      throw new Error(result.error.message);
    }

    const data = result.data as {
      actionId?: unknown;
      administrativeRequirements?: {
        status?: unknown;
        validatedAt?: unknown;
      };
    } | null;
    const requirements = data?.administrativeRequirements;
    if (
      !data ||
      !requirements ||
      data.actionId !== trimmedActionId ||
      requirements?.status !== "validated" ||
      (requirements.validatedAt !== null &&
        typeof requirements.validatedAt !== "string")
    ) {
      throw new Error("La validation des démarches a retourné un état invalide.");
    }

    return responseFor(
      trimmedActionId,
      requirements.validatedAt as string | null,
    );
  } catch (error) {
    return handleApiError(error, "POST /api/actions/:actionId/administrative-requirements");
  }
}
