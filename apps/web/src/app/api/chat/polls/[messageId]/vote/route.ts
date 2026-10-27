import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { normalizeChatPollVoteSummaryRows } from "@/lib/chat/poll-votes";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import { parseChatRows, parseChatSingleRow, parseChatSupabaseResult, isChatRecord } from "@/lib/chat/postgrest";
import { isChatPollOptionRuntimeRow } from "@/lib/chat/runtime-contracts";

const votePayloadSchema = z.object({
  optionId: z.string().uuid(),
});

type VoteRouteContext = {
  params: Promise<{ messageId: string }>;
};

type PollOptionRow = {
  id: string;
  position: number;
  label: string;
};

type PollVoteResponse = {
  messageId: string;
  options: Array<PollOptionRow & { voteCount: number }>;
  totalVotes: number;
  selectedOptionId: string | null;
};

type VoteIdentity = NonNullable<Awaited<ReturnType<typeof getCurrentUserIdentity>>>;

const ADMIN_ELU_ROLES = ["admin", "elu", "max"] as const;
const ORDINARY_POLL_CHANNELS = ["community", "territory", "action", "dm"] as const;

type ResolvedVotePoll = {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  poll: { options: PollOptionRow[] };
};

async function requireVoteIdentity(request: Request): Promise<Response | { userId: string; identity: VoteIdentity }> {
  const rateLimitResponse = await guardVoteRequest(request);
  if (rateLimitResponse) return rateLimitResponse;

  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();
  const identity = await getCurrentUserIdentity();
  if (!identity) return unauthorizedJsonResponse();
  return { userId, identity };
}

async function resolveVoteSupabase(
  identity: VoteIdentity,
  messageId: string,
): Promise<Response | ResolvedVotePoll> {
  const clerkRlsSupabase = await getSupabaseClerkRlsClient();
  if (!clerkRlsSupabase) {
    return NextResponse.json(
      { error: "Connexion sécurisée indisponible" },
      { status: 503 },
    );
  }

  const visibleOrdinaryPoll = await loadVisiblePoll(clerkRlsSupabase, messageId);
  if (visibleOrdinaryPoll) {
    return { supabase: clerkRlsSupabase, poll: visibleOrdinaryPoll };
  }

  if (!ADMIN_ELU_ROLES.some((role) => role === identity.activeRole)) {
    return inaccessiblePollResponse();
  }

  // The privileged path is deliberately a separate, message-scoped exception.
  // Clerk remains the authority for the role; service_role can only resolve an
  // admin_elu poll and is never used to bypass ordinary-channel RLS.
  const serviceSupabase = getSupabaseServerClient(true);
  const adminEluPoll = await loadVisiblePoll(serviceSupabase, messageId, "admin_elu");
  if (!adminEluPoll) {
    return inaccessiblePollResponse();
  }

  return { supabase: serviceSupabase, poll: adminEluPoll };
}

async function loadVisiblePoll(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  messageId: string,
  expectedChannelType?: "admin_elu",
): Promise<{ options: PollOptionRow[] } | null> {
  let messageQuery = supabase
    .from("app_messages")
    .select("id, message_kind, channel_type")
    .eq("id", messageId)
    .eq("message_kind", "poll");
  if (expectedChannelType) {
    messageQuery = messageQuery.eq("channel_type", expectedChannelType);
  }
  const rawMessageResult: unknown = await messageQuery.maybeSingle();

  const messageResult = parseChatSupabaseResult(rawMessageResult);
  if (messageResult.error) throw messageResult.error;
  const message = parseChatSingleRow(
    messageResult.data,
    (value): value is { id: string; message_kind: unknown; channel_type: string } =>
      isChatRecord(value) && typeof value.id === "string" && "message_kind" in value && typeof value.channel_type === "string",
  );
  const allowedChannels: readonly string[] = expectedChannelType
    ? [expectedChannelType]
    : ORDINARY_POLL_CHANNELS;
  if (!message || message.message_kind !== "poll" || !allowedChannels.includes(message.channel_type)) {
    return null;
  }

  const rawOptionsResult: unknown = await supabase
    .from("chat_poll_options")
    .select("id, position, label")
    .eq("message_id", messageId)
    .order("position", { ascending: true });

  const optionsResult = parseChatSupabaseResult(rawOptionsResult);
  if (optionsResult.error) throw optionsResult.error;
  const options = parseChatRows(optionsResult.data, isChatPollOptionRuntimeRow);
  if (!options) throw new Error("Les options du sondage sont invalides.");

  return { options };
}

function inaccessiblePollResponse(): NextResponse {
  return NextResponse.json(
    { error: "Sondage introuvable ou inaccessible" },
    { status: 404 },
  );
}

async function withVisiblePoll(
  identity: VoteIdentity,
  messageId: string,
  operation: (resolved: ResolvedVotePoll) => Promise<Response>,
  errorContext: string,
): Promise<Response> {
  try {
    const resolved = await resolveVoteSupabase(identity, messageId);
    if (resolved instanceof Response) return resolved;
    return await operation(resolved);
  } catch (error) {
    return handleApiError(error, errorContext);
  }
}

async function loadPollVoteResponse(
  serviceSupabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  messageId: string,
  options: PollOptionRow[],
): Promise<PollVoteResponse> {
  const rawResult: unknown = await serviceSupabase.rpc("get_my_chat_poll_vote_summaries", {
    p_message_ids: [messageId],
    p_user_id: userId,
  });
  const result = parseChatSupabaseResult(rawResult);
  if (result.error) throw result.error;

  const summary = normalizeChatPollVoteSummaryRows(result.data).find(
    (candidate) => candidate.messageId === messageId,
  );
  const counts = new Map(
    (summary?.options ?? []).map((option) => [option.optionId, option.voteCount]),
  );

  return {
    messageId,
    options: options.map((option) => ({
      ...option,
      voteCount: counts.get(option.id) ?? 0,
    })),
    totalVotes: summary?.totalVotes ?? 0,
    selectedOptionId: summary?.selectedOptionId ?? null,
  };
}

async function buildPollVoteResponse(
  userId: string,
  messageId: string,
  options: PollOptionRow[],
): Promise<NextResponse> {
  return NextResponse.json(
    await loadPollVoteResponse(getSupabaseServerClient(true), userId, messageId, options),
  );
}

async function guardVoteRequest(request: Request): Promise<Response | null> {
  const rateLimit = await verifyRateLimit(request, { limit: 30, window: 60 });
  return createServerRateLimitResponse(
    rateLimit.allowed,
    rateLimit.retryAfter,
    rateLimit,
  );
}

async function upsertVote(request: Request, context: VoteRouteContext) {
  const authContext = await requireVoteIdentity(request);
  if (authContext instanceof Response) return authContext;
  const { userId, identity } = authContext;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = votePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  const { messageId } = await context.params;

  return withVisiblePoll(
    identity,
    messageId,
    async ({ supabase: messageSupabase, poll }) => {
      if (!poll.options.some((option) => option.id === parsed.data.optionId)) {
        return NextResponse.json(
          { error: "Cette option n'appartient pas à ce sondage" },
          { status: 400 },
        );
      }

      const { error } = await messageSupabase.from("chat_poll_votes").upsert(
        {
          message_id: messageId,
          option_id: parsed.data.optionId,
          user_id: userId,
        },
        { onConflict: "message_id,user_id" },
      );
      if (error) {
        throw error;
      }

      return await buildPollVoteResponse(userId, messageId, poll.options);
    },
    "PUT /api/chat/polls/[messageId]/vote",
  );
}

export async function POST(request: Request, context: VoteRouteContext) {
  return upsertVote(request, context);
}

export async function PUT(request: Request, context: VoteRouteContext) {
  return upsertVote(request, context);
}

export async function DELETE(_request: Request, context: VoteRouteContext) {
  const authContext = await requireVoteIdentity(_request);
  if (authContext instanceof Response) return authContext;
  const { userId, identity } = authContext;

  const { messageId } = await context.params;

  return withVisiblePoll(
    identity,
    messageId,
    async ({ supabase: messageSupabase, poll }) => {
      const { error } = await messageSupabase
        .from("chat_poll_votes")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", userId);
      if (error) {
        throw error;
      }

      return await buildPollVoteResponse(userId, messageId, poll.options);
    },
    "DELETE /api/chat/polls/[messageId]/vote",
  );
}
