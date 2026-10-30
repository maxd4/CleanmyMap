import { NextResponse } from "next/server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { canAccessChatChannel, buildChannelAccessHint } from "@/lib/chat/channels";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveActionDiscussionAccess } from "@/lib/chat/action-conversations";
import { reserveDiscussionMessageSlot, toDiscussionRateLimitErrorPayload } from "@/lib/community/discussion-rate-limit";
import { persistChatPostAndNotify, type FeedbackReplyContext } from "./route.post-persistence";
import { resolveChatPostDestination, resolveChatPostExecutionZone } from "./route.post-context";
import {
  resolveFeedbackReplyContext,
  validateOwnerFeedbackContext,
  getChatSupabaseOrResponse,
  mapActionDiscussionAccessError,
  resolvePublicSharedAction,
} from "./route.post-support";
import type { ValidatedChatPost } from "./route.post-validation";

type ChatSupabase = Exclude<Awaited<ReturnType<typeof getChatSupabaseOrResponse>>, Response>;

export async function processValidatedChatPost({
  supabase,
  userId,
  identity,
  validated,
}: {
  supabase: ChatSupabase;
  userId: string;
  identity: NonNullable<Awaited<ReturnType<typeof getCurrentUserIdentity>>>;
  validated: ValidatedChatPost;
}) {
  const { data, isExternalActionShare, isBuddyContact } = validated;
  const serviceSupabase = getSupabaseServerClient(true);
  let feedbackReplyContext: FeedbackReplyContext | null = null;
  const isPrivilegedFeedbackReply = Boolean(data.feedbackId) && ["admin", "max"].includes(identity.activeRole);
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
  const destination = await resolveChatPostDestination({ supabase, serviceSupabase, userId, validated, zone, isExternalActionShare, isBuddyContact });
  if (destination instanceof Response) return destination;
  const quota = await reserveDiscussionMessageSlot(serviceSupabase, {
    userId,
    channel: data.channelType === "bug_report" ? "bug_report" : "discussion_event",
  });
  if (!quota.allowed) return NextResponse.json(toDiscussionRateLimitErrorPayload(quota), { status: 429 });
  const message = await persistChatPostAndNotify({ supabase, serviceSupabase, userId, validated, feedbackReplyContext, recipientId: destination.recipientId, actionConversationId: destination.actionConversationId, targetArrondissementId: destination.targetArrondissementId, targetZoneName: destination.targetZoneName, relatedEvent: destination.relatedEvent });
  if (message instanceof Response) return message;
  return NextResponse.json({ status: "sent", message }, { status: 201 });
}
