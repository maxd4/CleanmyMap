import { NextResponse } from "next/server";
import { hasAnalyticsConsentCookie } from "@/lib/analytics-consent";
import { pickTraceableActorName, type UserIdentity } from "@/lib/authz";
import { getVolunteerActionValidationIssues } from "@/lib/actions/submission-validation";
import { validationErrorResponse } from "@/lib/http/api-errors";
import { createActionSchema } from "@/lib/validation/action";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type CreateActionRequest = import("zod").infer<typeof createActionSchema>;

function buildVolunteerValidationDetails(
  issues: ReturnType<typeof getVolunteerActionValidationIssues>,
): Record<string, string[]> {
  return issues.reduce<Record<string, string[]>>((details, issue) => {
    (details[issue.field] ??= []).push(issue.message);
    return details;
  }, {});
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
    ...payload,
    actorName: pickTraceableActorName(identity, payload.actorName),
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
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ActionCreationValidationError) {
      return validationErrorResponse(error.fieldErrors);
    }
    throw error;
  }
}
