import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDmInbox } from "./use-dm-inbox";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const useSWRMock = vi.hoisted(() => vi.fn());
const surfaceState = vi.hoisted(() => ({ active: true }));
const realtimeEnabledMock = vi.hoisted(() => vi.fn(() => false));

vi.mock("swr", () => ({ default: useSWRMock }));
vi.mock("../chat-surface-activity-context", () => ({ useChatSurfaceActivity: () => surfaceState.active }));
vi.mock("@/lib/chat/chat-config", () => ({ isChatRealtimeEnabled: realtimeEnabledMock }));

type HookState = ReturnType<typeof useDmInbox>;

function renderHook(params: Parameters<typeof useDmInbox>[0]) {
  let state!: HookState;
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<Probe params={params} onState={(next) => { state = next; }} />);
  });
  return { get state() { return state; }, renderer };
}

function Probe({ params, onState }: { params: Parameters<typeof useDmInbox>[0]; onState: (state: HookState) => void }) {
  onState(useDmInbox(params));
  return null;
}

describe("useDmInbox behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    surfaceState.active = true;
    realtimeEnabledMock.mockReturnValue(false);
    useSWRMock.mockImplementation(() => ({
      data: { conversations: [{ peer: { id: "peer-1" } }] },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(async () => undefined),
    }));
  });

  it("does not query or subscribe without an active authenticated surface", () => {
    const renderer = renderHook({ enabled: true, currentUserId: undefined, supabase: null });
    expect(useSWRMock.mock.calls.at(-1)?.[0]).toBeNull();
    act(() => { renderer.renderer.unmount(); });

    surfaceState.active = false;
    const inactive = renderHook({ enabled: true, currentUserId: "user-1", supabase: { channel: vi.fn() } as never });
    expect(useSWRMock.mock.calls.at(-1)?.[0]).toBeNull();
    expect((inactive.renderer as unknown) as ReactTestRenderer).toBeDefined();
    inactive.renderer.unmount();
  });

  it("refreshes only for direct messages involving the current user and cleans the realtime channel", async () => {
    realtimeEnabledMock.mockReturnValue(true);
    const refresh = vi.fn(async () => undefined);
    const subscribe = vi.fn(() => ({ channel: "dm-inbox-updates" }));
    let handler!: (payload: { new: Record<string, unknown> }) => void;
    const channel = vi.fn(() => ({
      on: vi.fn((_event: string, _filter: unknown, callback: typeof handler) => {
        handler = callback;
        return { subscribe };
      }),
    }));
    const removeChannel = vi.fn(async () => undefined);
    const renderer = renderHook({ enabled: true, currentUserId: "user-1", supabase: { channel, removeChannel } as never });
    const swrMutate = useSWRMock.mock.results.at(-1)?.value.mutate as ReturnType<typeof vi.fn>;
    swrMutate.mockImplementation(refresh);

    handler({ new: { channel_type: "community", sender_id: "user-2", recipient_id: "user-1" } });
    handler({ new: { channel_type: "dm", sender_id: "user-2", recipient_id: "user-3" } });
    handler({ new: { channel_type: "dm", sender_id: "user-1", recipient_id: "user-3" } });
    handler({ new: { channel_type: "dm", sender_id: "user-2", recipient_id: "user-1" } });
    await act(async () => { await Promise.resolve(); });
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(channel).toHaveBeenCalledWith("dm-inbox-updates");
    expect(subscribe).toHaveBeenCalledTimes(1);

    act(() => { renderer.renderer.unmount(); });
    expect(removeChannel).toHaveBeenCalledWith({ channel: "dm-inbox-updates" });
  });

  it("maps inbox and read HTTP failures without a false refresh", async () => {
    const mutate = vi.fn(async () => undefined);
    useSWRMock.mockImplementation(() => ({ data: undefined, error: undefined, isLoading: false, mutate }));
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ code: "INBOX_DOWN", message: "inbox down" }), { status: 503 }));
    let fetcher!: (url: string) => Promise<unknown>;
    useSWRMock.mockImplementation((_key: unknown, candidateFetcher: (url: string) => Promise<unknown>) => {
      fetcher = candidateFetcher;
      return { data: undefined, error: undefined, isLoading: false, mutate };
    });
    const renderer = renderHook({ enabled: true, currentUserId: "user-1", supabase: null });
    await expect(fetcher("/api/chat/inbox")).rejects.toThrow("inbox down");

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ code: "READ_FORBIDDEN", message: "read forbidden" }), { status: 403 }));
    await expect(renderer.state.markConversationRead("peer-1")).rejects.toThrow("read forbidden");
    expect(fetchMock).toHaveBeenLastCalledWith("/api/chat/inbox", expect.objectContaining({ method: "PATCH" }));
    expect(mutate).not.toHaveBeenCalled();
    act(() => { renderer.renderer.unmount(); });
  });

  it("refreshes after a successful read mutation", async () => {
    const mutate = vi.fn(async () => undefined);
    useSWRMock.mockImplementation(() => ({ data: undefined, error: undefined, isLoading: false, mutate }));
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));
    const renderer = renderHook({ enabled: true, currentUserId: "user-1", supabase: null });
    await act(async () => { await renderer.state.markConversationRead("peer-1"); });
    expect(fetch).toHaveBeenCalledWith("/api/chat/inbox", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ peerId: "peer-1" }),
    }));
    expect(mutate).toHaveBeenCalledTimes(1);
    act(() => { renderer.renderer.unmount(); });
  });
});
