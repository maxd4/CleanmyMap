import { act, create } from "react-test-renderer";
import type { KeyedMutator } from "swr";
import { describe, expect, it, vi } from "vitest";
import type { ChatMessage, ChatMessagesResponse } from "../chat-types";
import { useChatShellPollVoting } from "./use-chat-shell-poll-voting";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

function poll(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "poll-1",
    sender_id: "peer-1",
    content: "Quelle option ?",
    channel_type: "community",
    topic_id: null,
    message_kind: "poll",
    related_event_id: null,
    action_id: null,
    related_event: null,
    poll_options: [
      { id: "yes", position: 1, label: "Oui", voteCount: 0 },
      { id: "no", position: 2, label: "Non", voteCount: 0 },
    ],
    totalVotes: 0,
    selectedOptionId: null,
    created_at: "2026-10-20T10:00:00.000Z",
    sender: { display_name: "Membre", handle: "membre", avatar_url: "" },
    ...overrides,
  };
}

function response(message: ChatMessage): ChatMessagesResponse {
  return { messages: [message], previousCursor: null, hasMore: false };
}

function jsonResponse(payload: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => payload } as Response;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function renderVoting(initialMessages = [poll()], initialMessagesKey = "scope-a") {
  let currentMessages = initialMessages;
  let currentMessagesKey = initialMessagesKey;
  let cache: ChatMessagesResponse = response(initialMessages[0]!);
  let revalidatedCache: ChatMessagesResponse | undefined;
  let latest!: ReturnType<typeof useChatShellPollVoting>;
  let renderer!: ReturnType<typeof create>;

  const mutateMessages = vi.fn(async (updater?: unknown, options?: { revalidate?: boolean }) => {
    if (updater === undefined && options?.revalidate) {
      if (revalidatedCache) cache = revalidatedCache;
      return cache;
    }
    if (typeof updater === "function") {
      cache = await (updater as (value: ChatMessagesResponse) => ChatMessagesResponse)(cache);
    }
    return cache;
  });

  function Probe({ messages, messagesKey }: { messages: ChatMessage[]; messagesKey: string }) {
    latest = useChatShellPollVoting({
      messages,
      messagesKey,
      mutateMessages: mutateMessages as unknown as KeyedMutator<ChatMessagesResponse>,
    });
    return null;
  }

  act(() => {
    renderer = create(<Probe messages={currentMessages} messagesKey={currentMessagesKey} />);
  });

  return {
    get latest() { return latest; },
    get cache() { return cache; },
    get mutateMessages() { return mutateMessages; },
    setRevalidatedCache(value: ChatMessagesResponse | undefined) { revalidatedCache = value; },
    rerender(messages: ChatMessage[], messagesKey: string) {
      currentMessages = messages;
      currentMessagesKey = messagesKey;
      act(() => renderer.update(<Probe messages={currentMessages} messagesKey={currentMessagesKey} />));
    },
    unmount() { renderer.unmount(); },
  };
}

describe("useChatShellPollVoting behavior", () => {
  it("optimistically votes once, reconciles the server summary and ignores a double click", async () => {
    const voting = renderVoting();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      messageId: "poll-1",
      options: [{ optionId: "yes", voteCount: 1 }, { optionId: "no", voteCount: 0 }],
      totalVotes: 1,
      selectedOptionId: "yes",
    }));
    vi.stubGlobal("fetch", fetchMock);

    let first!: Promise<unknown>;
    await act(async () => {
      first = voting.latest.handlePollVote("poll-1", "yes");
      await voting.latest.handlePollVote("poll-1", "yes");
      await first;
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(voting.cache.messages[0]?.selectedOptionId).toBe("yes");
    expect(voting.latest.pollVoteStates["poll-1"]).toEqual({ pending: false, error: null, retryOptionId: null });
    voting.unmount();
  });

  it("rolls back a refused vote and retries the same intent", async () => {
    const voting = renderVoting();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: "Vote refusé" }, false, 403))
      .mockResolvedValueOnce(jsonResponse({
        messageId: "poll-1",
        options: [{ optionId: "yes", voteCount: 1 }, { optionId: "no", voteCount: 0 }],
        totalVotes: 1,
        selectedOptionId: "yes",
      }));
    vi.stubGlobal("fetch", fetchMock);
    voting.setRevalidatedCache(response(poll()));

    await act(async () => {
      await voting.latest.handlePollVote("poll-1", "yes");
    });
    expect(voting.cache.messages[0]?.selectedOptionId).toBeNull();
    expect(voting.latest.pollVoteStates["poll-1"]?.error).toBe("Vote refusé");

    await act(async () => {
      await voting.latest.retryPollVote("poll-1");
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(voting.cache.messages[0]?.selectedOptionId).toBe("yes");
    expect(voting.latest.pollVoteStates["poll-1"]?.error).toBeNull();
    voting.unmount();
  });

  it("keeps a server-committed vote after a timeout instead of showing a false error", async () => {
    const voting = renderVoting();
    const fetchMock = vi.fn().mockRejectedValue(new Error("La connexion a expiré."));
    vi.stubGlobal("fetch", fetchMock);
    voting.setRevalidatedCache(response(poll({
      totalVotes: 1,
      selectedOptionId: "yes",
      poll_options: [
        { id: "yes", position: 1, label: "Oui", voteCount: 1 },
        { id: "no", position: 2, label: "Non", voteCount: 0 },
      ],
    })));

    await act(async () => {
      await voting.latest.handlePollVote("poll-1", "yes");
    });

    expect(voting.cache.messages[0]?.selectedOptionId).toBe("yes");
    expect(voting.latest.pollVoteStates["poll-1"]).toEqual({ pending: false, error: null, retryOptionId: null });
    voting.unmount();
  });

  it("treats a 409 conflict as a failed intent and exposes retry state", async () => {
    const voting = renderVoting();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ hint: "Le sondage a changé." }, false, 409));
    vi.stubGlobal("fetch", fetchMock);
    voting.setRevalidatedCache(response(poll()));

    await act(async () => {
      await voting.latest.handlePollVote("poll-1", "no");
    });

    expect(voting.cache.messages[0]?.selectedOptionId).toBeNull();
    expect(voting.latest.pollVoteStates["poll-1"]).toMatchObject({
      pending: false,
      error: "Le sondage a changé.",
      retryOptionId: "no",
    });
    voting.unmount();
  });

  it("does not apply a late response after navigation changes the message scope", async () => {
    const voting = renderVoting();
    const pending = deferred<Response>();
    const fetchMock = vi.fn().mockReturnValue(pending.promise);
    vi.stubGlobal("fetch", fetchMock);

    let request!: Promise<unknown>;
    await act(async () => {
      request = voting.latest.handlePollVote("poll-1", "yes");
    });
    voting.rerender([poll({ content: "Nouveau canal" })], "scope-b");
    const cacheBeforeLateResponse = voting.cache;

    await act(async () => {
      pending.resolve(jsonResponse({
        messageId: "poll-1",
        options: [{ optionId: "yes", voteCount: 1 }, { optionId: "no", voteCount: 0 }],
        totalVotes: 1,
        selectedOptionId: "yes",
      }));
      await request;
    });

    expect(voting.cache).toBe(cacheBeforeLateResponse);
    expect(voting.latest.pollVoteStates).toEqual({});
    voting.unmount();
  });
});
