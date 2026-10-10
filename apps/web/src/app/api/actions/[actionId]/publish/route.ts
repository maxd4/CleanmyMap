import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getCurrentUserIdentity, requireAuthenticatedAccess } from "@/lib/authz";
import { canManageAction } from "@/lib/actions/permissions";
import { loadActionById } from "@/lib/actions/store";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { canPublishPreAction } from "@/lib/actions/publication";
import { initializeActionRouteVersioning } from "@/lib/actions/route-version-persistence";
import { emitAdministrativeRequirementNotifications } from "@/lib/actions/administrative-requirement-notifications";
import type { ActionRow } from "@/types/database";
import { deriveActionFormalitiesFactsFromAction } from "@/lib/actions/formalities-action-context";
import { qualifyActionFormalities } from "@/lib/actions/formalities-qualification";
import {
  buildFormalitiesWorkflowState,
  isFormalitiesPublicationBlocked,
  normalizeActionFormalitiesWorkflow,
} from "@/lib/actions/formalities-workflow";
import { buildFormalitiesTerritoryFingerprint } from "@/lib/actions/formalities-rules";

export const runtime = "nodejs";
// Justification Vercel: la publication dépend de l’action et de l’utilisateur courant.
export const dynamic = "force-dynamic";

function buildPublicationUpdate(params: {
  currentPreparationData: ActionRow["preparation_data"];
  publishedAt: string;
  userId: string;
  formalitiesContext: Awaited<ReturnType<typeof deriveActionFormalitiesFactsFromAction>>;
  formalitiesWorkflow: ReturnType<typeof buildFormalitiesWorkflowState>;
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

function requiredFormalitiesNotReady(params: {
  qualification: ReturnType<typeof qualifyActionFormalities>;
  workflow: ReturnType<typeof buildFormalitiesWorkflowState>;
}): string[] {
  if (!isFormalitiesPublicationBlocked(params.qualification, params.workflow)) {
    return [];
  }
  const progressById = new Map(
    params.workflow.progress.map((progress) => [progress.formalityId, progress]),
  );
  return params.qualification.formalities
    .filter((formality) => {
      if (formality.requirementStatus !== "required") return false;
      const progress = progressById.get(formality.id);
      return !progress || !progress.active || !progress.validForQualification || progress.userStatus !== "sent";
    })
    .map((formality) => formality.id);
}

function spontaneousOrganizerPublicationError(
  action: Pick<ActionRow, "organizer_type">,
  organizerIds: string[],
) {
  if (action.organizer_type !== "spontaneous" || organizerIds.length > 0) {
    return null;
  }
  return NextResponse.json(
    { error: "Sélectionnez un compte utilisateur organisateur avant de publier cette action." },
    { status: 422 },
  );
}

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  const actionId = (await ctx.params).actionId.trim();
  if (!actionId) {
    return NextResponse.json({ error: "Identifiant d'action manquant." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient(true);
    const current = await loadActionById(supabase, actionId);
    if (!current) {
      return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
    }

    const identity = await getCurrentUserIdentity();
    const permissionIdentity = identity
      ? { userId: access.userId, role: identity.role, activeRole: identity.activeRole }
      : null;
    const organizerIds = await loadCanonicalActionOrganizerIdsForAction(
      supabase,
      actionId,
    );
    if (
      !canManageAction(
        permissionIdentity,
        { createdByClerkId: current.created_by_clerk_id },
        organizerIds,
      )
    ) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à publier cette action." },
        { status: 403 },
      );
    }

    if (current.status === "rejected" || current.status === "cancelled") {
      return NextResponse.json(
        { error: "Cette action est dans un état terminal et ne peut plus être publiée." },
        { status: 422 },
      );
    }

    if (current.published_at) {
      return NextResponse.json({
        status: "published",
        id: current.id,
        publishedAt: current.published_at,
        alreadyPublished: true,
      });
    }
    if (!canPublishPreAction({ actionPhase: current.action_phase, publishedAt: null })) {
      return NextResponse.json(
        { error: "Seule une pré-action peut être publiée depuis ce flux." },
        { status: 422 },
      );
    }

    const spontaneousOrganizerError = spontaneousOrganizerPublicationError(current, organizerIds);
    if (spontaneousOrganizerError) return spontaneousOrganizerError;

    const formalitiesContext = await deriveActionFormalitiesFactsFromAction(current);
    const qualification = qualifyActionFormalities(formalitiesContext);
    const formalitiesWorkflow = buildFormalitiesWorkflowState({
      facts: formalitiesContext,
      qualification,
      previous: normalizeActionFormalitiesWorkflow(
        current.preparation_data?.formalitiesWorkflow,
      ),
      actionDependencies: {
        locationLabel: current.location_label,
        actionDate: current.action_date,
        territoryFingerprint: buildFormalitiesTerritoryFingerprint(formalitiesContext.territory),
      },
    });
    const blockedFormalities = requiredFormalitiesNotReady({
      qualification,
      workflow: formalitiesWorkflow,
    });
    if (blockedFormalities.length > 0) {
      return NextResponse.json(
        {
          error: "Une formalité démontrée comme requise doit être déclarée envoyée avant la publication.",
          code: "required_formality_not_ready",
          formalityIds: blockedFormalities,
        },
        { status: 422 },
      );
    }

    const publishedAt = new Date().toISOString();
    const result = await supabase
      .from("actions")
      .update(buildPublicationUpdate({
        currentPreparationData: current.preparation_data,
        publishedAt,
        userId: access.userId,
        formalitiesContext,
        formalitiesWorkflow,
      }))
      .eq("id", actionId)
      .eq("created_by_clerk_id", current.created_by_clerk_id)
      .eq("action_phase", "pre_action")
      .is("published_at", null)
      .select("id, published_at")
      .maybeSingle();
    if (result.error) {
      throw result.error;
    }
    if (!result.data) {
      return NextResponse.json(
        { error: "La publication n'a pas pu être confirmée." },
        { status: 409 },
      );
    }

    await emitAdministrativeRequirementNotifications({
      supabase,
      actionId: result.data.id,
    });

    return NextResponse.json({
      status: "published",
      id: result.data.id,
      publishedAt: result.data.published_at,
      alreadyPublished: false,
    });
  } catch (error) {
    return handleApiError(error, "POST /api/actions/:actionId/publish");
  }
}
