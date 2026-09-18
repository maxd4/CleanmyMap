import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity, requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadActionById } from "@/lib/actions/store";
import { canManageAction } from "@/lib/actions/permissions";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { qualifyActionFormalities } from "@/lib/actions/formalities-qualification";
import {
  actionFormalitiesFactsSchema,
  applyFormalitiesWorkflowTransition,
  buildFormalitiesWorkflowState,
  deriveActionFormalitiesFacts,
  normalizeActionFormalitiesWorkflow,
  type FormalitiesWorkflowTransition,
} from "@/lib/actions/formalities-workflow";
import type { ActionFormalitiesFacts } from "@/lib/actions/formalities-qualification";

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

function factsFromAction(current: {
  department_code?: string | null;
  department_name?: string | null;
  preparation_data: {
    plannedObjective?: string | null;
    formalitiesContext?: unknown;
  } | null;
}): ActionFormalitiesFacts {
  const fallback = deriveActionFormalitiesFacts({
    departmentCode: current.department_code,
    departmentName: current.department_name,
    plannedObjective: current.preparation_data?.plannedObjective,
  });
  const parsed = actionFormalitiesFactsSchema.safeParse(
    current.preparation_data?.formalitiesContext,
  );
  return parsed.success ? parsed.data : fallback;
}

function responseFor(params: {
  actionId: string;
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
  });
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();

  const { actionId } = await ctx.params;
  const trimmedActionId = actionId.trim();
  if (!trimmedActionId) {
    return validationErrorResponse({ actionId: ["Identifiant d'action manquant."] });
  }

  try {
    const result = await loadAuthorizedAction(trimmedActionId, access.userId);
    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
    }
    if (result.kind === "forbidden") {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à consulter les formalités de cette action." },
        { status: 403 },
      );
    }
    if (result.current.action_phase !== "pre_action") {
      return NextResponse.json(
        { error: "Les formalités locales concernent uniquement une pré-action." },
        { status: 409 },
      );
    }

    const facts = factsFromAction(result.current);
    const qualification = qualifyActionFormalities(facts);
    const workflow = buildFormalitiesWorkflowState({
      facts,
      qualification,
      actionDependencies: {
        locationLabel: result.current.location_label,
        actionDate: result.current.action_date,
      },
      previous: normalizeActionFormalitiesWorkflow(
        result.current.preparation_data?.formalitiesWorkflow,
      ),
    });
    return responseFor({
      actionId: trimmedActionId,
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
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();

  const { actionId } = await ctx.params;
  const trimmedActionId = actionId.trim();
  if (!trimmedActionId) {
    return validationErrorResponse({ actionId: ["Identifiant d'action manquant."] });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  const parsed = formalitiesPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  try {
    const result = await loadAuthorizedAction(trimmedActionId, access.userId);
    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
    }
    if (result.kind === "forbidden") {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modifier les formalités de cette action." },
        { status: 403 },
      );
    }
    if (result.current.action_phase !== "pre_action") {
      return NextResponse.json(
        { error: "Les formalités locales concernent uniquement une pré-action." },
        { status: 409 },
      );
    }

    const currentFacts = factsFromAction(result.current);
    const facts = parsed.data.facts ?? currentFacts;
    const qualification = qualifyActionFormalities(facts);
    const previous = normalizeActionFormalitiesWorkflow(
      result.current.preparation_data?.formalitiesWorkflow,
    );
    let workflow = buildFormalitiesWorkflowState({
      facts,
      qualification,
      actionDependencies: {
        locationLabel: result.current.location_label,
        actionDate: result.current.action_date,
      },
      previous,
    });
    if (parsed.data.transition) {
      const isKnownFormality = qualification.formalities.some(
        (formality) => formality.id === parsed.data.transition?.formalityId,
      );
      if (!isKnownFormality) {
        return validationErrorResponse({
          transition: ["La formalité sélectionnée n'est plus applicable à ces faits."],
        });
      }
      workflow = applyFormalitiesWorkflowTransition({
        workflow,
        transition: parsed.data.transition as FormalitiesWorkflowTransition,
      });
    }

    const preparationData = {
      ...(result.current.preparation_data ?? {}),
      formalitiesContext: facts,
      formalitiesWorkflow: workflow,
    };
    const updated = await result.supabase
      .from("actions")
      .update({ preparation_data: preparationData })
      .eq("id", trimmedActionId)
      .select("id")
      .single();
    if (updated.error) throw updated.error;

    return responseFor({
      actionId: trimmedActionId,
      facts,
      qualification,
      workflow,
    });
  } catch (error) {
    return handleApiError(error, "PATCH /api/actions/:actionId/formalities");
  }
}
