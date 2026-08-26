import { describe, expect, it } from "vitest";
import {
  applyChatPollVoteSummary,
  applyOptimisticChatPollVote,
  normalizeChatPollVoteResponse,
  normalizeChatPollVoteSummaryRows,
} from "./poll-votes";

const poll = {
  id: "poll-1",
  message_kind: "poll",
  poll_options: [
    { id: "option-1", position: 1, label: "Oui", voteCount: 2 },
    { id: "option-2", position: 2, label: "Non", voteCount: 1 },
  ],
  totalVotes: 3,
  selectedOptionId: null as string | null,
};

describe("chat poll vote summaries", () => {
  it("normalizes aggregate rows without exposing voter identities", () => {
    const [summary] = normalizeChatPollVoteSummaryRows([
      {
        message_id: "poll-1",
        option_id: "option-1",
        vote_count: "2",
        total_votes: "3",
        selected_option_id: "option-2",
        user_id: "must-not-be-returned",
      },
      {
        message_id: "poll-1",
        option_id: "option-2",
        vote_count: 1,
        total_votes: 3,
        selected_option_id: "option-2",
      },
    ]);

    expect(summary).toEqual({
      messageId: "poll-1",
      options: [
        { optionId: "option-1", voteCount: 2 },
        { optionId: "option-2", voteCount: 1 },
      ],
      totalVotes: 3,
      selectedOptionId: "option-2",
    });
    expect(JSON.stringify(summary)).not.toContain("must-not-be-returned");
  });

  it("applies the server aggregate to the poll message", () => {
    const [summary] = normalizeChatPollVoteSummaryRows([
      {
        message_id: "poll-1",
        option_id: "option-1",
        vote_count: 4,
        total_votes: 5,
        selected_option_id: "option-1",
      },
      {
        message_id: "poll-1",
        option_id: "option-2",
        vote_count: 1,
        total_votes: 5,
        selected_option_id: "option-1",
      },
    ]);

    expect(applyChatPollVoteSummary(poll, summary)).toMatchObject({
      totalVotes: 5,
      selectedOptionId: "option-1",
      poll_options: [
        { id: "option-1", voteCount: 4 },
        { id: "option-2", voteCount: 1 },
      ],
    });
  });

  it("supports first vote, change and removal optimistically", () => {
    const firstVote = applyOptimisticChatPollVote(poll, "option-1");
    expect(firstVote).toMatchObject({
      totalVotes: 4,
      selectedOptionId: "option-1",
      poll_options: [
        { id: "option-1", voteCount: 3 },
        { id: "option-2", voteCount: 1 },
      ],
    });

    const changedVote = applyOptimisticChatPollVote(firstVote, "option-2");
    expect(changedVote).toMatchObject({
      totalVotes: 4,
      selectedOptionId: "option-2",
      poll_options: [
        { id: "option-1", voteCount: 2 },
        { id: "option-2", voteCount: 2 },
      ],
    });

    expect(applyOptimisticChatPollVote(changedVote, null)).toMatchObject({
      totalVotes: 3,
      selectedOptionId: null,
      poll_options: [
        { id: "option-1", voteCount: 2 },
        { id: "option-2", voteCount: 1 },
      ],
    });
  });

  it("normalizes the dedicated endpoint response", () => {
    expect(
      normalizeChatPollVoteResponse({
        messageId: "poll-1",
        options: [{ optionId: "option-1", voteCount: 7 }],
        totalVotes: 7,
        selectedOptionId: "option-1",
        voters: [{ userId: "must-not-be-returned" }],
      }),
    ).toEqual({
      messageId: "poll-1",
      options: [{ optionId: "option-1", voteCount: 7 }],
      totalVotes: 7,
      selectedOptionId: "option-1",
    });
  });
});
