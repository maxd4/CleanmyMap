import { NextResponse } from "next/server";
import { hasAnalyticsConsentCookie } from "@/lib/analytics-consent";
import { pickTraceableActorName, type UserIdentity } from "@/lib/authz";
import { getVolunteerActionValidationIssues } from "@/lib/actions/submission-validation";
import { normalizeActionVolunteerParticipationFromTotal } from "@/lib/actions/volunteer-participation";
import { validationErrorResponse } from "@/lib/http/api-errors";
import { createActionSchema } from "@/lib/validation/action";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CigaretteButtsLotsTotalLimitError } from "@/lib/waste/cigarette-butts";
import { hasActionEventEnded } from "@/lib/actions/finalization-eligibility";
import { resolveActionTemporalInstants } from "@/lib/actions/temporal";

type CreateActionRequest = import("zod").infer<typeof createActionSchema>;

function buildVolunteerValidationDetails(
  issues: ReturnType<typeof getVolunteerActionValidationIssues>,
): Record<string, string[]> {
  return issues.reduce<Record<string, string[]>>((details, issue) => {
    (details[issue.field] ??= []).push(issue.message);
    return details;
  }, {});
}

function hasFinalResultsPayload(payload: CreateActionRequest): boolean {
  const hasPositiveMeasurement = [
    payload.wasteKg,
    payload.cigaretteButts,
    payload.cigaretteButtsKg,
    payload.cigaretteButtsMassKg,
    payload.cigaretteButtsVolumeLiters,
    payload.collectorsCount,
  ].some((value) => typeof value === "number" && value > 0);
  const hasBreakdownResult = Object.values(payload.wasteBreakdown ?? {}).some((value) =>
    typeof value === "number" ? value > 0 : Array.isArray(value) ? value.length > 0 : Boolean(value),
  );

  return payload.submissionMode === "complete" ||
    payload.actionPhase === "post_action_draft" ||
    payload.actionPhase === "post_action_complete" ||
    hasPositiveMeasurement ||
    hasBreakdownResult ||
    Boolean(payload.cigaretteButtsMeasurements?.cigaretteButtsLots?.length) ||
    Boolean(payload.photos?.length) ||
    (payload.visionEstimate?.wasteKg.value ?? 0) > 0;
}

function withoutPreActionResults(payload: CreateActionRequest): CreateActionRequest {
  return {
    ...payload,
    wasteKg: null,
    cigaretteButts: null,
    cigaretteButtsKg: null,
    cigaretteButtsMassKg: null,
    cigaretteButtsVolumeLiters: null,
    cigaretteButtsMeasurements: null,
    cigaretteButtsLots: null,
    cigaretteButtsCondition: null,
    collectorsCount: null,
    wasteBreakdown: undefined,
    wasteMeasurementMethod: null,
    visionEstimate: null,
  };
}

export async function executeActionCreation({
  request,
  userId,
  payload,
  idempotencyKey,
  identity,
  isCreatorGlobalAdmin,
}: {
  request: Request;
  userId: string;
  payload: CreateActionRequest;
  idempotencyKey?: string;
  identity: UserIdentity | null;
  isCreatorGlobalAdmin: boolean;
}) {
  const includesFinalResults =
    hasFinalResultsPayload(payload);
  const isActionSubmission = (payload.recordType ?? "action") === "action";
  if (isActionSubmission && payload.actionPhase === "pre_action" && includesFinalResults) {
    return NextResponse.json(
      { error: "Les résultats finaux ne peuvent pas être enregistrés dans une pré-action.", code: "final_results_require_post_action_phase" },
      { status: 409 },
    );
  }
  const isFinalActionSubmission =
    isActionSubmission &&
    payload.actionPhase !== "pre_action" &&
    includesFinalResults;
  if (isFinalActionSubmission) {
    let eventEndAt: string | null = null;
    try {
      eventEndAt = resolveActionTemporalInstants({
        actionDate: payload.actionDate,
        actionTimezone: payload.actionTimezone,
        eventStartTime: payload.eventStartTime,
        eventEndTime: payload.eventEndTime,
      }).endAt?.toISOString() ?? null;
    } catch (error) {
      return validationErrorResponse({
        actionDate: [error instanceof Error ? error.message : "Les horaires de l'action sont invalides."],
      });
    }
    if (!hasActionEventEnded({
      action_date: payload.actionDate,
      action_timezone: payload.actionTimezone,
      event_end_at: eventEndAt,
    })) {
      return NextResponse.json(
        { error: "Les résultats finaux ne peuvent être envoyés qu'après la fin de l'action.", code: "finalization_not_eligible" },
        { status: 409 },
      );
    }
  }

  const supabase = getSupabaseServerClient(true);
  const {
    ActionCreationValidationError,
    createActionSubmission,
  } = await import("@/lib/actions/create-submission");
  const resolvedIdentity = identity ?? {
    displayName: userId,
    handle: userId,
    username: userId,
    email: null,
  };
  const normalizedPayload = {
    ...(isActionSubmission && payload.actionPhase === "pre_action"
      ? withoutPreActionResults(payload)
      : payload),
    actorName: pickTraceableActorName(identity, payload.actorName),
    volunteerParticipation:
      payload.recordType === "action" &&
      payload.submissionMode !== "quick" &&
      payload.actionPhase !== "pre_action"
        ? normalizeActionVolunteerParticipationFromTotal({
            volunteersCount: payload.volunteersCount,
            volunteerParticipation: payload.volunteerParticipation,
          })
        : payload.volunteerParticipation,
  };

  if (normalizedPayload.submissionMode !== "quick") {
    const volunteerIssues = getVolunteerActionValidationIssues(normalizedPayload);
    if (volunteerIssues.length > 0) {
      return validationErrorResponse(buildVolunteerValidationDetails(volunteerIssues));
    }
  }

  try {
    const created = await createActionSubmission({
      supabase,
      userId,
      payload: normalizedPayload,
      idempotencyKey,
      creator: {
        userId,
        displayName: resolvedIdentity.displayName,
        handle: resolvedIdentity.handle,
        username: resolvedIdentity.username,
        email: resolvedIdentity.email,
      },
      isCreatorGlobalAdmin,
      consentGranted: hasAnalyticsConsentCookie(request.headers.get("cookie")),
    });
    return NextResponse.json(
      {
        status: "created",
        id: created.id,
        source: created.source,
        retentionLoop: created.kind === "action" ? created.retentionLoop : null,
        geometryContribution: created.kind === "action" ? created.geometryContribution ?? null : null,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ActionCreationValidationError) {
      return validationErrorResponse(error.fieldErrors);
    }
    if (error instanceof CigaretteButtsLotsTotalLimitError) {
      return validationErrorResponse({ cigaretteButtsLots: [error.message] });
    }
    throw error;
  }
}
