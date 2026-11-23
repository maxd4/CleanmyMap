import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity, requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import {
  handleApiError,
  parseJsonBodyWithValidation,
  validationErrorResponse,
} from "@/lib/http/api-errors";
import { normalizeActionId } from "@/lib/actions/action-id";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadActionById } from "@/lib/actions/store";
import { canManageAction } from "@/lib/actions/permissions";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { qualifyActionFormalities } from "@/lib/actions/formalities/qualification";
import {
  actionFormalitiesFactsSchema,
  applyFormalitiesWorkflowTransition,
  buildFormalitiesWorkflowState,
  normalizeActionFormalitiesWorkflow,
  type FormalitiesWorkflowTransition,
} from "@/lib/actions/formalities/workflow";
import {
  buildFormalitiesTerritoryFingerprint,
} from "@/lib/actions/formalities/rules";
import type { ActionFormalitiesFacts } from "@/lib/actions/formalities/qualification";
import { deriveActionFormalitiesFactsFromAction } from "@/lib/actions/formalities/action-context";
import type { FormalitiesEmailActionData } from "@/lib/actions/formalities/email-draft";

export const runtime = "nodejs";
// Justification : cette route dynamique dépend de l'autorisation, des faits de qualification et de l'état persisté de l'action.
export const dynamic = "force-dynamic";

const formalitiesTransitionSchema = z
  .object({
    formalityId: z.string().trim().min(1).max(160),
    kind: z.enum(["mark_prepared", "declare_sent"]),
    proofReference: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

const formalitiesPatchSchema = z
  .object({
    facts: actionFormalitiesFactsSchema.optional(),
    transition: formalitiesTransitionSchema.optional(),
  })
  .strict()
  .refine((value) => value.facts || value.transition, {
    message: "Une qualification ou une mise à jour d'état est requise.",
  });

function resolveFormalitiesActionId(actionId: string): string | NextResponse {
  const normalized = normalizeActionId(actionId);
  return normalized ?? validationErrorResponse({ actionId: ["Identifiant d'action manquant."] });
}

async function resolveFormalitiesRequestContext(
  ctx: { params: Promise<{ actionId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const actionId = resolveFormalitiesActionId((await ctx.params).actionId);
  if (actionId instanceof Response) return actionId;
  return { userId: access.userId, actionId };
}

function resolveAuthorizedFormalitiesAction(
  result: Awaited<ReturnType<typeof loadAuthorizedAction>>,
  message: string,
) {
  if (result.kind === "not_found") {
    return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
  }
  if (result.kind === "forbidden") {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  return result;
}

async function loadAuthorizedAction(actionId: string, userId: string) {
  const supabase = getSupabaseServerClient(true);
  const current = await loadActionById(supabase, actionId);
  if (!current) {
    return { kind: "not_found" as const };
  }

  const identity = await getCurrentUserIdentity();
  const organizerIds = await loadCanonicalActionOrganizerIdsForAction(
    supabase,
    actionId,
  );
  const canManage = canManageAction(
    identity
      ? { userId, role: identity.role, activeRole: identity.activeRole }
      : null,
    { createdByClerkId: current.created_by_clerk_id, actionPhase: current.action_phase },
    organizerIds,
  );
  if (!canManage) {
    return { kind: "forbidden" as const };
  }

  return { kind: "ok" as const, current, supabase };
}

function responseFor(params: {
  actionId: string;
  action: NonNullable<Awaited<ReturnType<typeof loadActionById>>>;
  facts: ActionFormalitiesFacts;
  qualification: ReturnType<typeof qualifyActionFormalities>;
  workflow: ReturnType<typeof buildFormalitiesWorkflowState>;
}) {
  return NextResponse.json({
    status: "ok",
    actionId: params.actionId,
    facts: params.facts,
    qualification: params.qualification,
    workflow: params.workflow,
    actionData: buildFormalitiesEmailActionData(params.action, params.facts),
  });
}

function buildFormalitiesEmailActionData(
  action: NonNullable<Awaited<ReturnType<typeof loadActionById>>>,
  facts: ActionFormalitiesFacts,
): FormalitiesEmailActionData {
  const preparation = action.preparation_data;
  const contactAreaMode = action.derived_geometry_kind === "point"
    ? "single_location"
    : action.derived_geometry_kind
      ? "route_or_area"
      : "unknown";

  return {
    title: preparation.actionTitle ?? null,
    description: preparation.shortDescription ?? null,
    location: action.location_label,
    date: action.action_date,
    startTime: action.event_start_time ?? preparation.departureTime ?? preparation.meetingTime ?? null,
    endTime: action.event_end_time ?? null,
    participantCount: action.volunteers_count,
    organizerName: action.organizer_name ?? action.actor_name,
    contactAreaMode,
    contactArrondissementCode:
      contactAreaMode === "single_location" ? facts.territory.arrondissement?.code ?? null : null,
  };
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const requestContext = await resolveFormalitiesRequestContext(ctx);
  if (requestContext instanceof Response) return requestContext;
  const { userId, actionId: trimmedActionId } = requestContext;

  try {
    const result = await loadAuthorizedAction(trimmedActionId, userId);
    const authorized = resolveAuthorizedFormalitiesAction(
      result,
      "Vous n'êtes pas autorisé à consulter les formalités de cette action.",
    );
    if (authorized instanceof Response) return authorized;
    const current = authorized.current;
    if (current.action_phase !== "pre_action") {
      return NextResponse.json(
        { error: "Les formalités locales concernent uniquement une pré-action." },
        { status: 409 },
      );
    }

    const facts = await deriveActionFormalitiesFactsFromAction(current);
    const qualification = qualifyActionFormalities(facts);
    const workflow = buildFormalitiesWorkflowState({
      facts,
      qualification,
      actionDependencies: {
        locationLabel: current.location_label,
        actionDate: current.action_date,
        territoryFingerprint: buildFormalitiesTerritoryFingerprint(facts.territory),
      },
      previous: normalizeActionFormalitiesWorkflow(
        current.preparation_data?.formalitiesWorkflow,
      ),
    });
    return responseFor({
      actionId: trimmedActionId,
      action: current,
      facts,
      qualification,
      workflow,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/:actionId/formalities");
  }
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const requestContext = await resolveFormalitiesRequestContext(ctx);
  if (requestContext instanceof Response) return requestContext;
  const { userId, actionId: trimmedActionId } = requestContext;
  const parsedBody = await parseJsonBodyWithValidation(request, formalitiesPatchSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const parsed = parsedBody.data;

  try {
    const result = await loadAuthorizedAction(trimmedActionId, userId);
    const authorized = resolveAuthorizedFormalitiesAction(
      result,
      "Vous n'êtes pas autorisé à modifier les formalités de cette action.",
    );
    if (authorized instanceof Response) return authorized;
    const current = authorized.current;
    if (current.action_phase !== "pre_action") {
      return NextResponse.json(
        { error: "Les formalités locales concernent uniquement une pré-action." },
        { status: 409 },
      );
    }

    const currentFacts = await deriveActionFormalitiesFactsFromAction(current);
    const facts = parsed.facts
      ? {
          ...parsed.facts,
          isCortegeOrGathering:
            parsed.facts.isCortegeOrGathering ?? currentFacts.isCortegeOrGathering,
          territory: currentFacts.territory,
        }
      : currentFacts;
    const qualification = qualifyActionFormalities(facts);
    const previous = normalizeActionFormalitiesWorkflow(
      current.preparation_data?.formalitiesWorkflow,
    );
    let workflow = buildFormalitiesWorkflowState({
      facts,
      qualification,
      actionDependencies: {
        locationLabel: current.location_label,
        actionDate: current.action_date,
        territoryFingerprint: buildFormalitiesTerritoryFingerprint(facts.territory),
      },
      previous,
    });
    if (parsed.transition) {
      const isKnownFormality = qualification.formalities.some(
        (formality) => formality.id === parsed.transition?.formalityId,
      );
      if (!isKnownFormality) {
        return validationErrorResponse({
          transition: ["La formalité sélectionnée n'est plus applicable à ces faits."],
        });
      }
      workflow = applyFormalitiesWorkflowTransition({
        workflow,
        transition: parsed.transition as FormalitiesWorkflowTransition,
      });
    }

    const preparationData = {
      ...(current.preparation_data ?? {}),
      formalitiesContext: facts,
      formalitiesWorkflow: workflow,
    };
    const updated = await authorized.supabase
      .from("actions")
      .update({ preparation_data: preparationData })
      .eq("id", trimmedActionId)
      .eq("updated_at", current.updated_at)
      .select("id")
      .maybeSingle();
    if (updated.error) throw updated.error;
    if (!updated.data) {
      return NextResponse.json({ error: "L'action a changé pendant l'enregistrement des formalités. Rechargez-la." }, { status: 409 });
    }

    return responseFor({
      actionId: trimmedActionId,
      action: current,
      facts,
      qualification,
      workflow,
    });
  } catch (error) {
    return handleApiError(error, "PATCH /api/actions/:actionId/formalities");
  }
}
