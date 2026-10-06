import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { canAccessChatChannel, buildChannelAccessHint } from "@/lib/chat/channels";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import { resolveActionDiscussionAccess } from "@/lib/chat/action-conversations";
import { validateChatPostRequest } from "./route.post-validation";
import {
  persistChatPostAndNotify,
  type FeedbackReplyContext,
} from "./route.post-persistence";
import {
  resolveChatPostDestination,
  resolveChatPostExecutionZone,
} from "./route.post-context";
import {
  resolveFeedbackReplyContext,
  getChatSupabaseOrResponse,
  mapActionDiscussionAccessError,
  resolvePublicSharedAction,
} from "./route.post-support";
export async function POST(request: Request) {
  const writeRateLimit = await verifyRateLimit(request, { limit: 20, window: 60 });
  const writeRateLimitResponse = createServerRateLimitResponse(
    writeRateLimit.allowed,
    writeRateLimit.retryAfter,
    writeRateLimit,
  );
  if (writeRateLimitResponse) {
    return writeRateLimitResponse;
  }
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();
  const identity = await getCurrentUserIdentity({syncActiveRole:true});
  if (!identity) return unauthorizedJsonResponse();
  const validation = await validateChatPostRequest(request, userId);
  if (!validation.ok) return validation.response;
  const { data: parsedData, topicId, messageKind, isExternalActionShare } = validation.value;

  const supabaseResult = await getChatSupabaseOrResponse();
  if (supabaseResult instanceof Response) return supabaseResult;
  const supabase = supabaseResult;

  try {
    const serviceSupabase = getSupabaseServerClient(true);
    const parsed = { data: parsedData };

    let feedbackReplyContext: FeedbackReplyContext | null = null;
    if (parsed.data.feedbackId) {
      if (!["admin", "max"].includes(identity.activeRole)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const feedbackContext = await resolveFeedbackReplyContext(parsed.data);
      if (feedbackContext instanceof Response) return feedbackContext;
      feedbackReplyContext = feedbackContext;
    }

    const sharedActionResult = await resolvePublicSharedAction(
      serviceSupabase,
      parsed.data,
      isExternalActionShare,
    );
    if (sharedActionResult instanceof Response) return sharedActionResult;
    const sharedAction = sharedActionResult;
    const validatedPost = { data: parsed.data, topicId, messageKind, isExternalActionShare };

    if (parsed.data.channelType === "action" && parsed.data.actionId) {
      const actionId = parsed.data.actionId;
      const access = await resolveActionDiscussionAccess(serviceSupabase, actionId, userId, identity.activeRole);
      const accessError = mapActionDiscussionAccessError(access.state);
      if (accessError) return accessError;
      const { loadActionById } = await import("@/lib/actions/store");
      const action = await loadActionById(serviceSupabase, actionId);
      if (action?.status === "cancelled") {
        return NextResponse.json(
          { error: "Cette action a été annulée.", hint: "La discussion est conservée en lecture seule." },
          { status: 403 },
        );
      }
    }

    const zone = await resolveChatPostExecutionZone({
      supabase,
      serviceSupabase,
      userId,
      data: parsed.data,
      sharedAction,
    });
    if (zone instanceof Response) return zone;

    if (
      !canAccessChatChannel(parsed.data.channelType, {
        roleLabel: identity.activeRole,
        hasArrondissement: zone.hasArrondissement,
        hasGreaterParisZone: zone.hasGreaterParisZone,
        zoneContext: zone.zoneContext,
      })
    ) {
      return NextResponse.json(
        {
          error: "Canal indisponible",
          hint: buildChannelAccessHint(parsed.data.channelType),
        },
        { status: 403 },
      );
    }

    const destination = await resolveChatPostDestination({ supabase, serviceSupabase, userId, activeRole: identity.activeRole, validated: validatedPost, zone, isExternalActionShare });
    if (destination instanceof Response) return destination;

    const message = await persistChatPostAndNotify({ supabase, serviceSupabase, userId, validated: validatedPost, feedbackReplyContext, recipientId: destination.recipientId, actionConversationId: destination.actionConversationId, targetArrondissementId: destination.targetArrondissementId, targetZoneName: destination.targetZoneName, relatedEvent: destination.relatedEvent });
    if (message instanceof Response) return message;

    return NextResponse.json({ status: "sent", message }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/chat (general)");
  }
}
