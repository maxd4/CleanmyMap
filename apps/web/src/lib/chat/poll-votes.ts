import type { ChatPollOption } from "./polls";

export type ChatPollVoteSummaryRow = {
  message_id: string;
  option_id: string;
  vote_count: number | string;
  total_votes: number | string;
  selected_option_id: string | null;
};

export type ChatPollVoteSummary = {
  messageId: string;
  options: Array<{
    optionId: string;
    voteCount: number;
  }>;
  totalVotes: number;
  selectedOptionId: string | null;
};

export type ChatPollVoteResponse = {
  messageId: string;
  options: Array<{ optionId: string; voteCount: number }>;
  totalVotes: number;
  selectedOptionId: string | null;
};

function toNonNegativeCount(value: number | string | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

export function normalizeChatPollVoteSummaryRows(
  rows: unknown,
): ChatPollVoteSummary[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  const summaries = new Map<string, ChatPollVoteSummary>();
  for (const rawRow of rows) {
    if (!rawRow || typeof rawRow !== "object") {
      continue;
    }

    const row = rawRow as Partial<ChatPollVoteSummaryRow>;
    if (typeof row.message_id !== "string" || typeof row.option_id !== "string") {
      continue;
    }

    const summary = summaries.get(row.message_id) ?? {
      messageId: row.message_id,
      options: [],
      totalVotes: toNonNegativeCount(row.total_votes),
      selectedOptionId:
        typeof row.selected_option_id === "string" ? row.selected_option_id : null,
    };
    summary.options.push({
      optionId: row.option_id,
      voteCount: toNonNegativeCount(row.vote_count),
    });
    summary.totalVotes = Math.max(summary.totalVotes, toNonNegativeCount(row.total_votes));
    if (typeof row.selected_option_id === "string") {
      summary.selectedOptionId = row.selected_option_id;
    }
    summaries.set(row.message_id, summary);
  }

  return [...summaries.values()];
}

export function normalizeChatPollVoteResponse(
  payload: unknown,
): ChatPollVoteSummary | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const response = payload as Partial<ChatPollVoteResponse>;
  if (typeof response.messageId !== "string" || !Array.isArray(response.options)) {
    return null;
  }

  return {
    messageId: response.messageId,
    options: response.options.flatMap((option) => {
      if (!option || typeof option !== "object" || typeof option.optionId !== "string") {
        return [];
      }
      return [{
        optionId: option.optionId,
        voteCount: toNonNegativeCount(option.voteCount),
      }];
    }),
    totalVotes: toNonNegativeCount(response.totalVotes),
    selectedOptionId:
      typeof response.selectedOptionId === "string" ? response.selectedOptionId : null,
  };
}

type PollMessageLike = {
  message_kind: string;
  poll_options: ChatPollOption[];
  totalVotes?: number;
  selectedOptionId?: string | null;
};

export function applyChatPollVoteSummary<T extends PollMessageLike>(
  message: T,
  summary: ChatPollVoteSummary | undefined,
): T {
  if (message.message_kind !== "poll" || !summary) {
    return message;
  }

  const counts = new Map(summary.options.map((option) => [option.optionId, option.voteCount]));
  return {
    ...message,
    poll_options: message.poll_options.map((option) => ({
      ...option,
      voteCount: counts.get(option.id) ?? 0,
    })),
    totalVotes: summary.totalVotes,
    selectedOptionId: summary.selectedOptionId,
  };
}

export function applyOptimisticChatPollVote<T extends PollMessageLike>(
  message: T,
  nextOptionId: string | null,
): T {
  if (message.message_kind !== "poll") {
    return message;
  }

  const previousOptionId = message.selectedOptionId ?? null;
  if (previousOptionId === nextOptionId) {
    return message;
  }

  const options = message.poll_options.map((option) => ({
    ...option,
    voteCount: option.voteCount ?? 0,
  }));
  const previousOption = options.find((option) => option.id === previousOptionId);
  const nextOption = options.find((option) => option.id === nextOptionId);
  if (nextOptionId && !nextOption) {
    return message;
  }

  if (previousOption) {
    previousOption.voteCount = Math.max(0, (previousOption.voteCount ?? 0) - 1);
  }
  if (nextOption) {
    nextOption.voteCount = (nextOption.voteCount ?? 0) + 1;
  }

  const totalVotes = Math.max(
    0,
    (message.totalVotes ?? options.reduce((sum, option) => sum + (option.voteCount ?? 0), 0)) +
      (nextOption ? (previousOption ? 0 : 1) : previousOption ? -1 : 0),
  );

  return {
    ...message,
    poll_options: options,
    totalVotes,
    selectedOptionId: nextOptionId,
  };
}
