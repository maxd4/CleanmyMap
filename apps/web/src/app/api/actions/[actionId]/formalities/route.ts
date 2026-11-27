import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity } from "@/lib/authz";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
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
  availableFormalitiesTransitions,
  type FormalitiesWorkflowTransition,
} from "@/lib/actions/formalities/workflow";
import type { ActionFormalitiesFacts } from "@/lib/actions/formalities/qualification";
import {
  buildFormalitiesActionDependencies,
  deriveActionFormalitiesFactsFromAction,
} from "@/lib/actions/formalities/action-context";
import { loadMetropolitanContacts } from "@/lib/actions/formalities/metropolitan-coverage.server";
import { normalizeSupportNeeds } from "@/lib/actions/formalities/accompaniment";
import { nationalSupportResources } from "@/lib/actions/formalities/national-support-directory";
import type { FormalitiesEmailActionData } from "@/lib/actions/formalities/email-draft";

export const runtime = "nodejs";
// Justification : cette route dynamique dépend de l'autorisation, des faits de qualification et de l'état persisté de l'action.
export const dynamic = "force-dynamic";

const formalitiesTransitionSchema = z
  .object({
    formalityId: z.string().trim().min(1).max(160),
    kind: z.enum(["mark_prepared", "declare_sent", "record_receipt", "record_authorization", "record_refusal"]),
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
  request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const access = await requireActionRequestAccess(request);
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

  const identity = await getCurrentUserIdentity({ userId });
  const organizerIds = await loadCanonicalActionOrganizerIdsForAction(
    supabase,
    actionId,
  );
  const canManage = canManageAction(
    identity?.userId === userId
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
    availableTransitions: Object.fromEntries(params.qualification.formalities.map((formality) => [
      formality.id,
      availableFormalitiesTransitions(formality, params.workflow.progress.find((progress) => progress.formalityId === formality.id)),
    ])),
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
    materialsProvided: preparation.materialsProvided ?? null,
    recommendedMaterials: preparation.recommendedMaterials ?? null,
    safetyInstructions: preparation.safetyInstructions ?? null,
    equipmentInventory: preparation.equipmentInventory ?? null,
    contactAreaMode,
    contactArrondissementCode:
      contactAreaMode === "single_location" ? facts.territory.arrondissement?.code ?? null : null,
  };
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const requestContext = await resolveFormalitiesRequestContext(request, ctx);
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

    if (new URL(request.url).searchParams.get("contacts") === "1") {
      // Private action responses and organizer-declared workflow are user-specific; the no-store cache directive prevents cross-user disclosure.
      const needs = normalizeSupportNeeds(new URL(request.url).searchParams.getAll("need"));
      const contacts = await loadMetropolitanContacts(current, needs);
      return NextResponse.json({ ...contacts, resources: nationalSupportResources(needs) }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const facts = await deriveActionFormalitiesFactsFromAction(current);
    const qualification = qualifyActionFormalities(facts);
    const workflow = buildFormalitiesWorkflowState({
      facts,
      qualification,
      actionDependencies: {
        ...buildFormalitiesActionDependencies(current, facts.territory),
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
  const requestContext = await resolveFormalitiesRequestContext(request, ctx);
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
        ...buildFormalitiesActionDependencies(current, facts.territory),
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
      const formality = qualification.formalities.find(
        (item) => item.id === parsed.transition?.formalityId,
      );
      const currentProgress = workflow.progress.find(
        (item) => item.formalityId === parsed.transition?.formalityId,
      );
      if (!formality || !availableFormalitiesTransitions(formality, currentProgress).includes(parsed.transition.kind)) {
        return validationErrorResponse({
          transition: ["Cette transition n'est pas autorisée depuis l'état courant de la formalité."],
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
