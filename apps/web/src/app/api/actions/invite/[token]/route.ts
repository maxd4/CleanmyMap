import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { loadActionById } from "@/lib/actions/store";
import {
  hashInvitationToken,
  isInvitationExpired,
  isInvitationTokenFormat,
  resolvePrivateInvitationActionState,
  type PrivateInvitationActionState,
} from "@/lib/actions/private-invitation";
import { claimFinishedActionParticipation } from "@/lib/actions/participation/post-action-claims";
import { appendParticipationClaimAudit } from "@/lib/actions/participation/claim-audit";
import {
  isActionInvitationLinkResolutionRow,
  isActionParticipantStateRow,
  isActionRegistrationStateRow,
  isPrivateActionRegistrationRow,
} from "@/lib/actions/runtime-contracts";
import {
  parseActionSingleRow,
  parseActionSupabaseResult,
} from "@/lib/actions/query";

type Context = { params: Promise<{ token: string }> };

type InvitationResolution =
  | { kind: "invalid" | "revoked" | "expired" }
  | {
      kind: "valid";
      action: Awaited<ReturnType<typeof loadActionById>>;
      actionId: string;
      actionState: PrivateInvitationActionState;
      expiresAt: string;
      tokenHash: string;
      supabase: ReturnType<typeof getSupabaseServerClient>;
    };

type RecipientState = {
  registrationStatus: "pending" | "confirmed" | "cancelled" | null;
  registrationSource: string | null;
  registrationCancellationReason: string | null;
  participationStatus: "pending" | "confirmed" | "cancelled" | null;
  participationSource: string | null;
};

function emptyRecipientState(): RecipientState {
  return {
    registrationStatus: null,
    registrationSource: null,
    registrationCancellationReason: null,
    participationStatus: null,
    participationSource: null,
  };
}

async function loadRecipientState(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  actionId: string,
  actionState: PrivateInvitationActionState,
  userId: string | null,
): Promise<RecipientState> {
  if (!userId) return emptyRecipientState();

  if (actionState === "post_action_claim") {
    const rawResult: unknown = await supabase
      .from("action_participants")
      .select("participation_status, participation_source")
      .eq("action_id", actionId)
      .eq("user_id", userId)
      .maybeSingle();
    const result = parseActionSupabaseResult(rawResult);
    if (result.error) throw result.error;
    const row = parseActionSingleRow(result.data, isActionParticipantStateRow);
    if (result.data !== null && !row) {
      throw new Error("La réponse de participation de l'invitation est invalide.");
    }
    return {
      ...emptyRecipientState(),
      participationStatus: row?.participation_status ?? null,
      participationSource: row?.participation_source ?? null,
    };
  }

  const rawResult: unknown = await supabase
    .from("action_registrations")
    .select("registration_status, registration_source, registration_cancellation_reason")
    .eq("action_id", actionId)
    .eq("user_id", userId)
    .maybeSingle();
  const result = parseActionSupabaseResult(rawResult);
  if (result.error) throw result.error;
  const row = parseActionSingleRow(result.data, isActionRegistrationStateRow);
  if (result.data !== null && !row) {
    throw new Error("La réponse d'inscription de l'invitation est invalide.");
  }
  return {
    ...emptyRecipientState(),
    registrationStatus: row?.registration_status ?? null,
    registrationSource: row?.registration_source ?? null,
    registrationCancellationReason: row?.registration_cancellation_reason ?? null,
  };
}

async function resolveOptionalUserId(request: Request): Promise<string | null> {
  try {
    const access = await requireActionRequestAccess(request);
    return access.ok ? access.userId : null;
  } catch {
    return null;
  }
}

async function resolveInvite(ctx: Context): Promise<InvitationResolution> {
  const token = (await ctx.params).token.trim();
  if (!isInvitationTokenFormat(token)) return { kind: "invalid" };

  const supabase = getSupabaseServerClient(true);
  const tokenHash = hashInvitationToken(token);
  const rawLink: unknown = await supabase
    .from("action_invitation_links")
    .select("action_id, revoked_at, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  const linkResult = parseActionSupabaseResult(rawLink);
  if (linkResult.error) throw linkResult.error;
  const link = parseActionSingleRow(linkResult.data, isActionInvitationLinkResolutionRow);
  if (!link) {
    if (linkResult.data === null) return { kind: "invalid" };
    throw new Error("La réponse du lien d'invitation est invalide.");
  }
  if (link.revoked_at) return { kind: "revoked" };
  if (!link.expires_at || isInvitationExpired(link.expires_at)) {
    return { kind: "expired" };
  }

  const action = await loadActionById(supabase, link.action_id);
  if (!action) return { kind: "invalid" };
  const actionState = resolvePrivateInvitationActionState(action);
  if (actionState === "closed") return { kind: "invalid" };

  return {
    kind: "valid",
    action,
    actionId: link.action_id,
    actionState,
    expiresAt: link.expires_at,
    tokenHash,
    supabase,
  };
}

function minimalProjection(
  action: Awaited<ReturnType<typeof loadActionById>>,
  resolution: Extract<InvitationResolution, { kind: "valid" }>,
  recipient: RecipientState,
) {
  if (!action) return null;
  const preparation = action.preparation_data ?? {};
  return {
    title: preparation.actionTitle ?? action.location_label,
    shortDescription: preparation.shortDescription ?? null,
    actionDate: action.action_date,
    meetingTime: preparation.meetingTime ?? action.event_start_time ?? null,
    pointDeRendezVous: preparation.pointDeRendezVous ?? action.location_label,
    zoneCiblePrevue: preparation.zoneCiblePrevue ?? null,
    organizerLabel: action.organizer_name ?? null,
    actionPhase: action.action_phase,
    invitationState: resolution.actionState,
    expiresAt: resolution.expiresAt,
    registrationStatus: recipient.registrationStatus,
    registrationSource: recipient.registrationSource,
    registrationCancellationReason: recipient.registrationCancellationReason,
    participationStatus: recipient.participationStatus,
    participationSource: recipient.participationSource,
  };
}

function unavailableResponse(resolution: Exclude<InvitationResolution, { kind: "valid" }>) {
  const message = resolution.kind === "expired"
    ? "Ce lien d’invitation a expiré. Demandez un nouveau lien à l’organisateur."
    : resolution.kind === "revoked"
      ? "Ce lien d’invitation a été révoqué ou remplacé. Demandez un nouveau lien à l’organisateur."
      : "Lien d’invitation invalide ou action indisponible.";
  return NextResponse.json({ error: message }, { status: 404 });
}

function privateRegistrationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("private_registration_action_awaiting_finalization")) {
    return NextResponse.json(
      {
        code: "ACTION_AWAITING_FINALIZATION",
        error: "Action en attente de finalisation. Les demandes ouvriront lorsque le bilan sera finalisé.",
      },
      { status: 409 },
    );
  }
  if (message.includes("private_registration_already_decided")) {
    return NextResponse.json(
      { code: "REGISTRATION_ALREADY_DECIDED", error: "Cette inscription a déjà été refusée ou annulée." },
      { status: 409 },
    );
  }
  if (message.includes("private_registration_invitation_invalid")) {
    return NextResponse.json(
      { error: "Lien d’invitation invalide, expiré ou révoqué." },
      { status: 404 },
    );
  }
  if (message.includes("private_registration_action_unavailable")) {
    return NextResponse.json(
      { error: "Cette action n’est plus disponible pour une demande privée." },
      { status: 404 },
    );
  }
  return null;
}

export async function GET(request: Request, ctx: Context) {
  try {
    const resolution = await resolveInvite(ctx);
    if (resolution.kind !== "valid") return unavailableResponse(resolution);
    const userId = await resolveOptionalUserId(request);
    const recipient = await loadRecipientState(
      resolution.supabase,
      resolution.actionId,
      resolution.actionState,
      userId,
    );
    return NextResponse.json({
      status: "ok",
      action: minimalProjection(resolution.action, resolution, recipient),
    });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/invite/:token");
  }
}

export async function POST(request: Request, ctx: Context) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  try {
    const resolution = await resolveInvite(ctx);
    if (resolution.kind !== "valid") return unavailableResponse(resolution);

    if (resolution.actionState === "awaiting_finalization") {
      return NextResponse.json(
        {
          code: "ACTION_AWAITING_FINALIZATION",
          error: "Action en attente de finalisation. Les demandes ouvriront lorsque le bilan sera finalisé.",
        },
        { status: 409 },
      );
    }

    if (resolution.actionState === "pre_action") {
      const rawResult: unknown = await resolution.supabase.rpc("request_private_action_registration", {
        p_action_id: resolution.actionId,
        p_user_id: access.userId,
        p_token_hash: resolution.tokenHash,
      });
      const result = parseActionSupabaseResult(rawResult);
      if (result.error) throw result.error;
      const row = parseActionSingleRow(result.data, isPrivateActionRegistrationRow);
      if (!row) throw new Error("La réponse d'inscription de l'invitation est invalide.");
      return NextResponse.json({
        status: "ok",
        flow: "pre_action",
        actionId: resolution.actionId,
        registrationStatus: row.registration_status,
        registrationSource: "invite_link",
      });
    }

    // The shared owner invokes claim_private_action_participation only with
    // this invitation hash; public/mobile callers never provide that proof.
    const claim = await claimFinishedActionParticipation(resolution.supabase, {
      actionId: resolution.actionId,
      userId: access.userId,
      tokenHash: resolution.tokenHash,
    });
    await appendParticipationClaimAudit({
      actionId: resolution.actionId,
      userId: access.userId,
      operationIdPrefix: "private-action-post-claim",
      claim,
    });
    return NextResponse.json({
      status: "ok",
      flow: "post_action_claim",
      actionId: resolution.actionId,
      participationStatus: claim.participationStatus,
      participationSource: claim.participationSource,
      alreadyRequested: claim.alreadyRequested,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "NotFoundError") {
      return NextResponse.json({ error: "Cette action n’est plus éligible au rattachement." }, { status: 404 });
    }
    if (error instanceof Error && error.name === "ValidationError") {
      return validationErrorResponse({ invitation: [error.message] });
    }
    const response = privateRegistrationError(error);
    return response ?? handleApiError(error, "POST /api/actions/invite/:token");
  }
}
