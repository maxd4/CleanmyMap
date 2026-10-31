import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { useChatShellNotificationEffects } from "./use-chat-shell-notification-effects";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock("@/lib/chat/topic-presentation", () => ({
  getChatTopicIdsForPresentationScope: () => ["general", "moderation"],
}));

type HookParams = Parameters<typeof useChatShellNotificationEffects>[0];

const baseParams: HookParams = {
  activeChannelType: "dm",
  activeTopicId: null,
  selectedActionId: null,
  feedState: "ready",
  messagerieMode: true,
  selectedRecipient: { id: "peer-1", display_name: "Alice", handle: "alice", avatar_url: null },
  conversations: [],
  setSelectedRecipient: vi.fn(),
  markConversationRead: vi.fn(async () => undefined),
  markChatNotificationsRead: vi.fn(async () => undefined),
  messages: [{ id: "message-1" }],
};

function renderEffects(overrides: Partial<HookParams> = {}) {
  let renderer!: ReactTestRenderer;
  const params = { ...baseParams, ...overrides };
  act(() => { renderer = create(<Probe params={params} />); });
  return { renderer, params };
}

function Probe({ params }: { params: HookParams }) {
  useChatShellNotificationEffects(params);
  return null;
}

describe("useChatShellNotificationEffects behavior", () => {
  it("marks a direct-message conversation and its notification once per latest message", async () => {
    const markConversationRead = vi.fn(async () => undefined);
    const markChatNotificationsRead = vi.fn(async () => undefined);
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<Probe params={{ ...baseParams, markConversationRead, markChatNotificationsRead }} />);
    });
    await act(async () => { await Promise.resolve(); });
    expect(markConversationRead).toHaveBeenCalledTimes(1);
    expect(markChatNotificationsRead).toHaveBeenCalledWith({ channelType: "dm", peerId: "peer-1" });

    act(() => {
      renderer.update(<Probe params={{ ...baseParams, markConversationRead, markChatNotificationsRead }} />);
    });
    expect(markConversationRead).toHaveBeenCalledTimes(1);
    act(() => {
      renderer.update(<Probe params={{ ...baseParams, markConversationRead, markChatNotificationsRead, messages: [{ id: "message-2" }] }} />);
    });
    expect(markConversationRead).toHaveBeenCalledTimes(2);
    expect(markChatNotificationsRead).toHaveBeenCalledTimes(2);
    renderer.unmount();
  });

  it("does not mark degraded or non-messagerie feeds and retries after a failed marker", async () => {
    const markConversationRead = vi.fn().mockRejectedValueOnce(new Error("read failed")).mockResolvedValue(undefined);
    const markChatNotificationsRead = vi.fn().mockRejectedValueOnce(new Error("notify failed")).mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<Probe params={{ ...baseParams, feedState: "degraded", markConversationRead, markChatNotificationsRead }} />);
    });
    expect(markConversationRead).not.toHaveBeenCalled();

    act(() => {
      renderer.update(<Probe params={{ ...baseParams, messagerieMode: false, markConversationRead, markChatNotificationsRead }} />);
    });
    expect(markConversationRead).not.toHaveBeenCalled();

    act(() => {
      renderer.update(<Probe params={{ ...baseParams, markConversationRead, markChatNotificationsRead, messages: [{ id: "message-2" }] }} />);
    });
    await act(async () => { await Promise.resolve(); });
    expect(markConversationRead).toHaveBeenCalledTimes(1);
    expect(markChatNotificationsRead).toHaveBeenCalledTimes(1);
    renderer.unmount();
  });

  it("uses presentation topics for channel reads, action scope for action reads and syncs stale recipients", async () => {
    const setSelectedRecipient = vi.fn();
    const markChatNotificationsRead = vi.fn(async () => undefined);
    const currentPeer = { id: "peer-1", display_name: "Alice updated", handle: "alice2", avatar_url: "new-avatar" };
    const { renderer } = renderEffects({
      activeChannelType: "community",
      selectedRecipient: null,
      conversations: [],
      setSelectedRecipient,
      markChatNotificationsRead,
    });
    await act(async () => { await Promise.resolve(); });
    expect(markChatNotificationsRead).toHaveBeenCalledWith({
      channelType: "community",
      topicId: null,
      topicIds: ["general", "moderation"],
    });
    renderer.update(<Probe params={{ ...baseParams, activeChannelType: "action", selectedActionId: "action-1", selectedRecipient: null, markChatNotificationsRead }} />);
    await act(async () => { await Promise.resolve(); });
    expect(markChatNotificationsRead).toHaveBeenCalledWith({ channelType: "action", actionId: "action-1" });
    await act(async () => {
      renderer.update(<Probe params={{ ...baseParams, selectedRecipient: { id: "peer-1", display_name: "Alice", handle: "old", avatar_url: null }, conversations: [{ peer: currentPeer }] as never, setSelectedRecipient, markChatNotificationsRead }} />);
      await Promise.resolve();
    });
    expect(setSelectedRecipient).toHaveBeenCalledWith(currentPeer);
    renderer.unmount();
  });
});
