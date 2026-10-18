import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { canAccessChatChannel, buildChannelAccessHint } from "@/lib/chat/channels";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import { resolveActionDiscussionAccess } from "@/lib/chat/action-conversations";
import { validateChatPostRequest, type ValidatedChatPost } from "./route.post-validation";
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
  validateOwnerFeedbackContext,
  getChatSupabaseOrResponse,
  mapActionDiscussionAccessError,
  resolvePublicSharedAction,
} from "./route.post-support";

async function processValidatedChatPost({
  supabase,
  userId,
  identity,
  validated,
}: {
  supabase: Awaited<ReturnType<typeof getChatSupabaseOrResponse>> extends infer T ? Exclude<T, Response> : never;
  userId: string;
  identity: NonNullable<Awaited<ReturnType<typeof getCurrentUserIdentity>>>;
  validated: ValidatedChatPost;
}) {
  const { data, isExternalActionShare } = validated;
  const serviceSupabase = getSupabaseServerClient(true);
  let feedbackReplyContext: FeedbackReplyContext | null = null;
  const isPrivilegedFeedbackReply =
    Boolean(data.feedbackId) && ["admin", "max"].includes(identity.activeRole);
  if (isPrivilegedFeedbackReply) {
    const feedbackContext = await resolveFeedbackReplyContext(data);
    if (feedbackContext instanceof Response) return feedbackContext;
    feedbackReplyContext = feedbackContext;
  } else if (data.feedbackId) {
    const ownerContextError = await validateOwnerFeedbackContext(data, userId);
    if (ownerContextError) return ownerContextError;
  }
  const sharedActionResult = await resolvePublicSharedAction(serviceSupabase, data, isExternalActionShare);
  if (sharedActionResult instanceof Response) return sharedActionResult;
  if (data.channelType === "action" && data.actionId) {
    const access = await resolveActionDiscussionAccess(serviceSupabase, data.actionId, userId, identity.activeRole);
    const accessError = mapActionDiscussionAccessError(access.state);
    if (accessError) return accessError;
    const { loadActionById } = await import("@/lib/actions/store");
    const action = await loadActionById(serviceSupabase, data.actionId);
    if (action?.status === "cancelled") return NextResponse.json({ error: "Cette action a été annulée.", hint: "La discussion est conservée en lecture seule." }, { status: 403 });
  }
  const zone = await resolveChatPostExecutionZone({ serviceSupabase, userId, data, sharedAction: sharedActionResult });
  if (zone instanceof Response) return zone;
  if (!canAccessChatChannel(data.channelType, { roleLabel: identity.activeRole, hasArrondissement: zone.hasArrondissement, hasGreaterParisZone: zone.hasGreaterParisZone, zoneContext: zone.zoneContext })) {
    return NextResponse.json({ error: "Canal indisponible", hint: buildChannelAccessHint(data.channelType) }, { status: 403 });
  }
  const destination = await resolveChatPostDestination({ supabase, serviceSupabase, userId, validated, zone, isExternalActionShare });
  if (destination instanceof Response) return destination;
  // All message creation is performed by the server client only after the
  // Clerk identity, quota, channel, destination and conversation checks above.
  // The RLS client remains available to read data needed during resolution and
  // to preserve the caller-scoped readback contract where applicable.
  const message = await persistChatPostAndNotify({ supabase, serviceSupabase, userId, validated, feedbackReplyContext, recipientId: destination.recipientId, actionConversationId: destination.actionConversationId, targetArrondissementId: destination.targetArrondissementId, targetZoneName: destination.targetZoneName, relatedEvent: destination.relatedEvent });
  if (message instanceof Response) return message;
  return NextResponse.json({ status: "sent", message }, { status: 201 });
}
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
  const identity = await getCurrentUserIdentity({ userId, syncActiveRole: true });
  if (!identity) return unauthorizedJsonResponse();
  const validation = await validateChatPostRequest(request, userId);
  if (!validation.ok) return validation.response;
  const { data: parsedData, topicId, messageKind, isExternalActionShare } = validation.value;

  const supabaseResult = await getChatSupabaseOrResponse();
  if (supabaseResult instanceof Response) return supabaseResult;
  const supabase = supabaseResult;

  try {
    return await processValidatedChatPost({ supabase, userId, identity, validated: { data: parsedData, topicId, messageKind, isExternalActionShare } });
  } catch (error) {
    return handleApiError(error, "POST /api/chat (general)");
  }
}
