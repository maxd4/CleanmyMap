import { useEffect } from "react";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessagesResponse, ChatMessage } from "../chat-types";
import { useChatData, type SendChatMessageParams } from "./use-chat-data";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

const useSWRMock = vi.hoisted(() => vi.fn());
const fetchChatJsonMock = vi.hoisted(() => vi.fn());
const useChatUserSearchMock = vi.hoisted(() => vi.fn());
const realtimeEnabledMock = vi.hoisted(() => vi.fn(() => false));
const surfaceActiveMock = vi.hoisted(() => ({ value: true }));

vi.mock("swr", () => ({ default: useSWRMock }));
vi.mock("./use-chat-user-search", () => ({
  fetchChatJson: fetchChatJsonMock,
  useChatUserSearch: useChatUserSearchMock,
  useDebouncedChatQuery: (query: string) => query.trim(),
}));
vi.mock("../chat-surface-activity-context", () => ({
  useChatSurfaceActivity: () => surfaceActiveMock.value,
}));
vi.mock("@/lib/chat/chat-config", () => ({
  isChatRealtimeEnabled: realtimeEnabledMock,
}));

const currentMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: "message-current",
  sender_id: "user-1",
  content: "Message courant",
  channel_type: "community",
  topic_id: null,
  message_kind: "message",
  related_event_id: null,
  action_id: null,
  related_event: null,
  poll_options: [],
  created_at: "2026-10-20T10:00:00.000Z",
  sender: { display_name: "Moi", handle: "moi", avatar_url: "" },
  ...overrides,
});

function response(messages: ChatMessage[], overrides: Partial<ChatMessagesResponse> = {}): ChatMessagesResponse {
  return { messages, previousCursor: null, hasMore: false, ...overrides };
}

const baseParams = {
  activeChannelType: "community" as const,
  activeTopicId: null,
  activeTopicIds: [] as const,
  selectedRecipientId: null,
  effectiveZone: "",
  territoryFocus: null,
  showMentions: false,
  mentionQuery: "",
  recipientQuery: "",
  currentUserId: "user-1",
  canAccessProtectedChat: true,
};

let swrState: { data?: ChatMessagesResponse; error?: Error; isLoading: boolean };
let mutateMock: ReturnType<typeof vi.fn>;
type ProbeProps = Partial<Parameters<typeof useChatData>[0]>;

function Probe({ onState, ...props }: ProbeProps & { onState?: (state: ReturnType<typeof useChatData>) => void }) {
  const state = useChatData({ ...baseParams, ...props } as Parameters<typeof useChatData>[0]);
  useEffect(() => { onState?.(state); }, [onState, state]);
  return <output data-state={state.feedState} />;
}

function renderProbe(props: ProbeProps = {}) {
  let currentState!: ReturnType<typeof useChatData>;
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(<Probe {...props} onState={(state) => { currentState = state; }} />); });
  return { renderer, getState: () => currentState };
}

function installBrowserEvents() {
  const documentListeners = new Map<string, EventListener>();
  const windowListeners = new Map<string, EventListener>();
  const documentMock = {
    visibilityState: "visible",
    addEventListener: vi.fn((type: string, listener: EventListener) => documentListeners.set(type, listener)),
    removeEventListener: vi.fn((type: string) => documentListeners.delete(type)),
    dispatch(type: string) { documentListeners.get(type)?.(new Event(type)); },
  };
  const windowMock = {
    addEventListener: vi.fn((type: string, listener: EventListener) => windowListeners.set(type, listener)),
    removeEventListener: vi.fn((type: string) => windowListeners.delete(type)),
    dispatch(type: string) { windowListeners.get(type)?.(new Event(type)); },
    setInterval,
    clearInterval,
  };
  vi.stubGlobal("document", documentMock);
  vi.stubGlobal("window", windowMock);
  return { documentMock, windowMock };
}

beforeEach(() => {
  vi.clearAllMocks();
  surfaceActiveMock.value = true;
  realtimeEnabledMock.mockReturnValue(false);
  swrState = { data: undefined, error: undefined, isLoading: false };
  mutateMock = vi.fn(async (updater: unknown, options?: { optimisticData?: unknown }) => {
    let next = swrState.data;
    if (options?.optimisticData) {
      next = typeof options.optimisticData === "function"
        ? await (options.optimisticData as (value: unknown) => unknown)(next) as ChatMessagesResponse | undefined
        : options.optimisticData as ChatMessagesResponse;
    }
    if (typeof updater === "function") {
      next = await (updater as (value: ChatMessagesResponse | undefined) => unknown)(next) as ChatMessagesResponse | undefined;
    } else if (updater) {
      next = updater as ChatMessagesResponse;
    }
    swrState.data = next as ChatMessagesResponse | undefined;
    return next;
  });
  useSWRMock.mockImplementation((key: unknown) => ({
    data: typeof key === "string" && key.startsWith("/api/chat?") ? swrState.data : undefined,
    error: typeof key === "string" && key.startsWith("/api/chat?") ? swrState.error : undefined,
    isLoading: typeof key === "string" && key.startsWith("/api/chat?") ? swrState.isLoading : false,
    mutate: mutateMock,
  }));
  useChatUserSearchMock.mockReturnValue({ mentionUsersData: undefined, dmUsersData: undefined });
  installBrowserEvents();
});

describe("useChatData behavior", () => {
  it("does not query or expose protected messages without an admissible scope", () => {
    const { renderer, getState } = renderProbe({ currentUserId: undefined, canAccessProtectedChat: false });
    expect(useSWRMock.mock.calls.some(([key]) => typeof key === "string" && key.startsWith("/api/chat?"))).toBe(false);
    expect(getState().messages).toEqual([]);
    expect(getState().isLive).toBe(false);
    renderer.unmount();

    surfaceActiveMock.value = false;
    const { renderer: inactive, getState: getInactiveState } = renderProbe();
    expect(useSWRMock.mock.calls.at(-1)?.[0]).toBeNull();
    expect(getInactiveState().messages).toEqual([]);
    inactive.unmount();
  });

  it("loads older pages with a cursor, deduplicates and preserves chronological order", async () => {
    const duplicate = currentMessage({ id: "message-current", created_at: "2026-10-20T10:00:00.000Z" });
    const oldest = currentMessage({ id: "message-old", sender_id: "peer-1", created_at: "2026-10-19T09:00:00.000Z" });
    swrState.data = response([duplicate], {
      hasMore: true,
      previousCursor: { createdAt: duplicate.created_at, id: duplicate.id },
    });
    const older = response([oldest, duplicate], { hasMore: false, previousCursor: null });
    fetchChatJsonMock.mockResolvedValueOnce(older);
    const { renderer, getState } = renderProbe();

    await act(async () => { await getState().loadPreviousMessages(); });
    expect(fetchChatJsonMock).toHaveBeenCalledWith("/api/chat?channelType=community&beforeCreatedAt=2026-10-20T10%3A00%3A00.000Z&beforeId=message-current");
    expect(swrState.data?.messages.map((item) => item.id)).toEqual(["message-old", "message-current"]);
    expect(new Set(swrState.data?.messages.map((item) => item.id)).size).toBe(2);
    expect(mutateMock).toHaveBeenCalledWith(expect.any(Function), { revalidate: false });
    renderer.unmount();
  });

  it("builds mention and recipient scopes while excluding the current user", () => {
    const peer = { id: "user-2", display_name: "Alice", handle: "alice", avatar_url: null };
    useChatUserSearchMock.mockImplementation(({ mentionUsersKey, dmUsersKey }: { mentionUsersKey: string | null; dmUsersKey: string | null }) => ({
      mentionUsersData: mentionUsersKey ? { users: [peer, { ...peer, id: "user-1", handle: "me" }] } : undefined,
      dmUsersData: dmUsersKey ? { users: [peer, { ...peer, id: "user-1", handle: "me" }] } : undefined,
    }));
    const { renderer, getState } = renderProbe({
      activeChannelType: "dm",
      selectedRecipientId: "user-2",
      showMentions: true,
      mentionQuery: " al ",
      recipientQuery: " bo ",
    });
    expect(useChatUserSearchMock).toHaveBeenCalledWith({
      mentionUsersKey: "/api/chat/users?q=al",
      dmUsersKey: "/api/chat/users?q=bo",
    });
    expect(getState().mentionSuggestions.map((user) => user.id)).toEqual(["user-2"]);
    expect(getState().dmSuggestions.map((user) => user.id)).toEqual(["user-2"]);
    renderer.unmount();
  });

  it("optimistically sends a message, replaces the optimistic row and keeps attachments from the draft", async () => {
    swrState.data = response([]);
    const sent = currentMessage({ id: "message-server", content: "Envoyé", attachment_url: "https://cdn.example.test/photo.jpg" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: sent }), { status: 200 })));
    const { renderer, getState } = renderProbe();
    const optimistic = currentMessage({ id: "optimistic", content: "Brouillon", attachment_url: "https://cdn.example.test/photo.jpg" });
    const params: SendChatMessageParams = {
      optimisticMessage: optimistic,
      body: { channelType: "community", messageKind: "message", content: "Brouillon", attachmentUrl: optimistic.attachment_url },
    };

    await act(async () => {
      await getState().sendChatMessage(params);
    });
    expect(fetch).toHaveBeenCalledWith("/api/chat", expect.objectContaining({ method: "POST" }));
    expect(swrState.data?.messages.map((item) => item.id)).toEqual(["message-server"]);
    expect(swrState.data?.messages[0]?.attachment_url).toBe("https://cdn.example.test/photo.jpg");
    renderer.unmount();
  });

  it("refreshes on visibility and reconnect, pauses offline, and cleans listeners and timers", async () => {
    vi.useFakeTimers();
    const { documentMock, windowMock } = installBrowserEvents();
    swrState.data = response([currentMessage()]);
    fetchChatJsonMock.mockResolvedValue(response([currentMessage({ id: "message-new" })]));
    const { renderer, getState } = renderProbe();
    expect(documentMock.addEventListener).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(windowMock.addEventListener).toHaveBeenCalledWith("online", expect.any(Function));
    expect(windowMock.addEventListener).toHaveBeenCalledWith("offline", expect.any(Function));

    documentMock.visibilityState = "hidden";
    act(() => { documentMock.dispatch("visibilitychange"); });
    windowMock.dispatch("offline");
    expect(getState().isLoading).toBe(false);
    documentMock.visibilityState = "visible";
    await act(async () => { documentMock.dispatch("visibilitychange"); await Promise.resolve(); });
    await act(async () => { windowMock.dispatch("online"); await Promise.resolve(); });
    expect(fetchChatJsonMock).toHaveBeenCalledWith("/api/chat?channelType=community");

    act(() => renderer.unmount());
    expect(documentMock.removeEventListener).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(windowMock.removeEventListener).toHaveBeenCalledWith("online", expect.any(Function));
    expect(windowMock.removeEventListener).toHaveBeenCalledWith("offline", expect.any(Function));
    vi.useRealTimers();
  });

  it("subscribes to realtime only when enabled and removes the channel on unmount", async () => {
    realtimeEnabledMock.mockReturnValue(true);
    const subscription = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    };
    const supabase = {
      channel: vi.fn(() => subscription),
      removeChannel: vi.fn(async () => undefined),
    };
    const { renderer } = renderProbe({ supabase: supabase as unknown as Parameters<typeof useChatData>[0]["supabase"] });
    expect(supabase.channel).toHaveBeenCalledWith("chat-updates");
    expect(subscription.on).toHaveBeenCalledTimes(2);
    expect(subscription.subscribe).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
    await Promise.resolve();
    expect(supabase.removeChannel).toHaveBeenCalledWith(subscription);
  });
});
