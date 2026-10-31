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

function responseMessages(messages: ChatMessage[]): ChatMessagesResponse {
  return { messages, previousCursor: null, hasMore: false };
}

function response(message: ChatMessage): ChatMessagesResponse {
  return responseMessages([message]);
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
  let cache: ChatMessagesResponse = responseMessages(initialMessages);
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

  it("keeps the newest A intent authoritative after deferred resets in an A to B to A return", async () => {
    const otherMessage = poll({ id: "poll-2", content: "Autre sondage" });
    const voting = renderVoting([poll(), otherMessage]);
    const oldResponse = deferred<Response>();
    const newResponse = deferred<Response>();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(oldResponse.promise)
      .mockReturnValueOnce(newResponse.promise);
    vi.stubGlobal("fetch", fetchMock);

    let oldRequest!: Promise<unknown>;
    await act(async () => {
      oldRequest = voting.latest.handlePollVote("poll-1", "yes");
      await Promise.resolve();
    });
    voting.rerender([poll({ content: "Canal B" }), otherMessage], "scope-b");
    voting.rerender([poll(), otherMessage], "scope-a");

    let newRequest!: Promise<unknown>;
    await act(async () => {
      newRequest = voting.latest.handlePollVote("poll-1", "no");
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(voting.latest.pollVoteStates["poll-1"]?.pending).toBe(true);
    const cacheBeforeOldResponse = voting.cache;

    await act(async () => {
      oldResponse.resolve(jsonResponse({
        messageId: "poll-1",
        options: [{ optionId: "yes", voteCount: 9 }, { optionId: "no", voteCount: 0 }],
        totalVotes: 9,
        selectedOptionId: "yes",
      }));
      await oldRequest;
    });

    expect(voting.cache).toBe(cacheBeforeOldResponse);
    expect(voting.cache.messages.find((message) => message.id === "poll-1")?.selectedOptionId).toBe("no");
    expect(voting.cache.messages.find((message) => message.id === "poll-2")?.selectedOptionId).toBeNull();

    await act(async () => {
      await voting.latest.handlePollVote("poll-1", "no");
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      newResponse.resolve(jsonResponse({
        messageId: "poll-1",
        options: [{ optionId: "yes", voteCount: 0 }, { optionId: "no", voteCount: 1 }],
        totalVotes: 1,
        selectedOptionId: "no",
      }));
      await newRequest;
    });

    expect(voting.cache.messages.find((message) => message.id === "poll-1")?.selectedOptionId).toBe("no");
    expect(voting.latest.pollVoteStates["poll-1"]).toEqual({ pending: false, error: null, retryOptionId: null });
    voting.unmount();
  });

  it("clears an old retry state when the scope changes without a new request", async () => {
    const voting = renderVoting();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: "Vote refusé" }, false, 403));
    vi.stubGlobal("fetch", fetchMock);
    voting.setRevalidatedCache(response(poll()));

    await act(async () => {
      await voting.latest.handlePollVote("poll-1", "yes");
    });
    expect(voting.latest.pollVoteStates["poll-1"]).toMatchObject({
      pending: false,
      error: "Vote refusé",
      retryOptionId: "yes",
    });

    voting.rerender([poll({ content: "Canal B" })], "scope-b");
    await act(async () => {
      await Promise.resolve();
    });

    expect(voting.latest.pollVoteStates).toEqual({});
    voting.unmount();
  });

  it("ignores an old error and finally after a newer A intent starts", async () => {
    const voting = renderVoting();
    const oldResponse = deferred<Response>();
    const newResponse = deferred<Response>();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(oldResponse.promise)
      .mockReturnValueOnce(newResponse.promise);
    vi.stubGlobal("fetch", fetchMock);

    let oldRequest!: Promise<unknown>;
    await act(async () => {
      oldRequest = voting.latest.handlePollVote("poll-1", "yes");
      await Promise.resolve();
    });
    voting.rerender([poll({ content: "Canal B" })], "scope-b");
    voting.rerender([poll()], "scope-a");

    let newRequest!: Promise<unknown>;
    await act(async () => {
      newRequest = voting.latest.handlePollVote("poll-1", "no");
      await Promise.resolve();
    });

    await act(async () => {
      oldResponse.reject(new Error("Ancienne erreur"));
      await oldRequest;
    });

    expect(voting.latest.pollVoteStates["poll-1"]).toMatchObject({ pending: true, error: null });
    await act(async () => {
      await voting.latest.handlePollVote("poll-1", "no");
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      newResponse.resolve(jsonResponse({
        messageId: "poll-1",
        options: [{ optionId: "yes", voteCount: 0 }, { optionId: "no", voteCount: 1 }],
        totalVotes: 1,
        selectedOptionId: "no",
      }));
      await newRequest;
    });

    expect(voting.latest.pollVoteStates["poll-1"]).toEqual({ pending: false, error: null, retryOptionId: null });
    voting.unmount();
  });

  it("rejects a successful response belonging to another poll and keeps retry recovery", async () => {
    const voting = renderVoting();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      messageId: "poll-foreign",
      options: [{ optionId: "yes", voteCount: 12 }],
      totalVotes: 12,
      selectedOptionId: "yes",
    }));
    vi.stubGlobal("fetch", fetchMock);
    voting.setRevalidatedCache(response(poll()));

    await act(async () => {
      await voting.latest.handlePollVote("poll-1", "yes");
    });

    expect(voting.cache.messages[0]?.selectedOptionId).toBeNull();
    expect(voting.latest.pollVoteStates["poll-1"]).toEqual({
      pending: false,
      error: "La réponse du sondage ne correspond pas au sondage demandé.",
      retryOptionId: "yes",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    voting.unmount();
  });
});
