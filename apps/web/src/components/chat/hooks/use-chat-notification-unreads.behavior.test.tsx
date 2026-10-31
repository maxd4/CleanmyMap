import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChatNotificationUnreads } from "./use-chat-notification-unreads";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const useSWRMock = vi.hoisted(() => vi.fn());
const surfaceState = vi.hoisted(() => ({ active: true }));
const realtimeEnabledMock = vi.hoisted(() => vi.fn(() => false));

vi.mock("swr", () => ({ default: useSWRMock }));
vi.mock("../chat-surface-activity-context", () => ({ useChatSurfaceActivity: () => surfaceState.active }));
vi.mock("@/lib/chat/chat-config", () => ({ isChatRealtimeEnabled: realtimeEnabledMock }));

type HookState = ReturnType<typeof useChatNotificationUnreads>;

function renderHook(params: Parameters<typeof useChatNotificationUnreads>[0]) {
  let state!: HookState;
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<Probe params={params} onState={(next) => { state = next; }} />);
  });
  return { get state() { return state; }, renderer };
}

function Probe({ params, onState }: { params: Parameters<typeof useChatNotificationUnreads>[0]; onState: (state: HookState) => void }) {
  const state = useChatNotificationUnreads(params);
  onState(state);
  return null;
}

describe("useChatNotificationUnreads behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    surfaceState.active = true;
    realtimeEnabledMock.mockReturnValue(false);
    useSWRMock.mockImplementation(() => ({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(async () => undefined),
    }));
  });

  it("does not build a private query without an active authenticated scope", async () => {
    const renderer = renderHook({ enabled: true, currentUserId: undefined, supabase: null });
    expect(useSWRMock.mock.calls.at(-1)?.[0]).toBeNull();
    await expect(renderer.state.markRead({ channelType: "dm", peerId: "peer-1" })).resolves.toBe(0);
    renderer.renderer.unmount();

    surfaceState.active = false;
    const inactive = renderHook({ enabled: true, currentUserId: "user-1", supabase: {} as never });
    expect(useSWRMock.mock.calls.at(-1)?.[0]).toBeNull();
    inactive.renderer.unmount();
  });

  it("normalizes RPC rows and fails closed on malformed Supabase responses", async () => {
    let fetcher!: () => Promise<unknown>;
    useSWRMock.mockImplementation((_key: unknown, candidateFetcher: () => Promise<unknown>) => {
      fetcher = candidateFetcher;
      return { data: undefined, error: undefined, isLoading: true, mutate: vi.fn(async () => undefined) };
    });
    const rpc = vi.fn().mockResolvedValue({ data: [
      { channel_type: "community", topic_id: "relais_associatif", unread_count: "2" },
      { channel_type: "dm", topic_id: null, unread_count: 3.8 },
      { channel_type: "unknown", topic_id: null, unread_count: 99 },
      { channel_type: "community", topic_id: "invalid", unread_count: 4 },
    ], error: null });
    const renderer = renderHook({ enabled: true, currentUserId: "user-1", supabase: { rpc } as never });
    await expect(fetcher()).resolves.toEqual(expect.objectContaining({ community: 6, dm: 3, communityByTopic: { relais_associatif: 2 } }));
    expect(rpc).toHaveBeenCalledWith("get_my_unread_chat_notification_counts");
    rpc.mockResolvedValueOnce({ data: null, error: { message: "RLS denied" } });
    await expect(fetcher()).rejects.toThrow("RLS denied");
    renderer.renderer.unmount();
  });

  it("deduplicates topic scopes, sends the correct owner-bound RPC arguments and refreshes once", async () => {
    const mutate = vi.fn(async () => undefined);
    useSWRMock.mockImplementation(() => ({ data: undefined, error: undefined, isLoading: false, mutate }));
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: 2, error: null })
      .mockResolvedValueOnce({ data: 3, error: null })
      .mockResolvedValueOnce({ data: 4, error: null });
    const renderer = renderHook({ enabled: true, currentUserId: "user-1", supabase: { rpc } as never });

    await expect(renderer.state.markRead({ channelType: "community", topicId: null, topicIds: ["general", "general", "moderation"] as never })).resolves.toBe(5);
    expect(rpc).toHaveBeenNthCalledWith(1, "mark_my_chat_notifications_read", {
      p_channel_type: "community", p_topic_id: "general", p_dm_peer_id: null, p_action_id: null,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "mark_my_chat_notifications_read", {
      p_channel_type: "community", p_topic_id: "moderation", p_dm_peer_id: null, p_action_id: null,
    });
    expect(mutate).toHaveBeenCalledTimes(1);

    await expect(renderer.state.markRead({ channelType: "action", actionId: "action-1" })).resolves.toBe(4);
    expect(rpc).toHaveBeenLastCalledWith("mark_my_chat_notifications_read", {
      p_channel_type: "action", p_topic_id: null, p_dm_peer_id: null, p_action_id: "action-1",
    });
    renderer.renderer.unmount();
  });

  it("does not refresh counts after a failed read RPC", async () => {
    const mutate = vi.fn(async () => undefined);
    useSWRMock.mockImplementation(() => ({ data: undefined, error: undefined, isLoading: false, mutate }));
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "read forbidden" } });
    const renderer = renderHook({ enabled: true, currentUserId: "user-1", supabase: { rpc } as never });

    await expect(renderer.state.markRead({ channelType: "dm", peerId: "peer-1" })).rejects.toThrow("read forbidden");
    expect(mutate).not.toHaveBeenCalled();
    renderer.renderer.unmount();
  });
});
