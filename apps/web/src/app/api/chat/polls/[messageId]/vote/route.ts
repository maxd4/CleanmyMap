import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { normalizeChatPollVoteSummaryRows } from "@/lib/chat/poll-votes";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";

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

async function loadVisiblePoll(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  messageId: string,
): Promise<{ options: PollOptionRow[] } | null> {
  const { data: message, error: messageError } = await supabase
    .from("app_messages")
    .select("id, message_kind, channel_type")
    .eq("id", messageId)
    .maybeSingle();

  if (messageError) {
    throw messageError;
  }
  if (
    !message ||
    message.message_kind !== "poll" ||
    message.channel_type !== "community"
  ) {
    return null;
  }

  const { data: options, error: optionsError } = await supabase
    .from("chat_poll_options")
    .select("id, position, label")
    .eq("message_id", messageId)
    .order("position", { ascending: true });

  if (optionsError) {
    throw optionsError;
  }

  return { options: (options ?? []) as PollOptionRow[] };
}

async function loadPollVoteResponse(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  messageId: string,
  options: PollOptionRow[],
): Promise<PollVoteResponse> {
  const { data, error } = await supabase.rpc("get_my_chat_poll_vote_summaries", {
    p_message_ids: [messageId],
  });
  if (error) {
    throw error;
  }

  const summary = normalizeChatPollVoteSummaryRows(data).find(
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

async function guardVoteRequest(request: Request): Promise<Response | null> {
  const rateLimit = await verifyRateLimit(request, { limit: 30, window: 60 });
  return createServerRateLimitResponse(
    rateLimit.allowed,
    rateLimit.retryAfter,
    rateLimit,
  );
}

async function upsertVote(request: Request, context: VoteRouteContext) {
  const rateLimitResponse = await guardVoteRequest(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

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
  const supabase = await getSupabaseClerkRlsClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Connexion sécurisée indisponible" },
      { status: 503 },
    );
  }

  try {
    const poll = await loadVisiblePoll(supabase, messageId);
    if (!poll) {
      return NextResponse.json(
        { error: "Sondage introuvable ou inaccessible" },
        { status: 404 },
      );
    }

    if (!poll.options.some((option) => option.id === parsed.data.optionId)) {
      return NextResponse.json(
        { error: "Cette option n'appartient pas à ce sondage" },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("chat_poll_votes").upsert(
      {
        message_id: messageId,
        option_id: parsed.data.optionId,
        user_id: userId,
      },
      { onConflict: "message_id,user_id" },
    );
    if (error) {
      return handleApiError(error, "PUT /api/chat/polls/[messageId]/vote");
    }

    return NextResponse.json(
      await loadPollVoteResponse(supabase, messageId, poll.options),
    );
  } catch (error) {
    return handleApiError(error, "PUT /api/chat/polls/[messageId]/vote");
  }
}

export async function POST(request: Request, context: VoteRouteContext) {
  return upsertVote(request, context);
}

export async function PUT(request: Request, context: VoteRouteContext) {
  return upsertVote(request, context);
}

export async function DELETE(_request: Request, context: VoteRouteContext) {
  const rateLimitResponse = await guardVoteRequest(_request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  const { messageId } = await context.params;
  const supabase = await getSupabaseClerkRlsClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Connexion sécurisée indisponible" },
      { status: 503 },
    );
  }

  try {
    const poll = await loadVisiblePoll(supabase, messageId);
    if (!poll) {
      return NextResponse.json(
        { error: "Sondage introuvable ou inaccessible" },
        { status: 404 },
      );
    }

    const { error } = await supabase
      .from("chat_poll_votes")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", userId);
    if (error) {
      return handleApiError(error, "DELETE /api/chat/polls/[messageId]/vote");
    }

    return NextResponse.json(
      await loadPollVoteResponse(supabase, messageId, poll.options),
    );
  } catch (error) {
    return handleApiError(error, "DELETE /api/chat/polls/[messageId]/vote");
  }
}
