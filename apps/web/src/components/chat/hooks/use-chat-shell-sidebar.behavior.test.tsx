import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import {
  createEmptyChatNotificationUnreadCounts,
  type ChatNotificationUnreadCounts,
} from "@/lib/chat/chat-notification-unreads";
import { getChatTopicPresentationGroups } from "@/lib/chat/topic-presentation";
import type { ChatTopicId } from "@/lib/chat/topics";
import { useChatShellSidebar } from "./use-chat-shell-sidebar";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

type SidebarParams = Parameters<typeof useChatShellSidebar>[0];
type SidebarState = ReturnType<typeof useChatShellSidebar>;

const communityTopics = getChatTopicPresentationGroups("community");

function baseParams(overrides: Partial<SidebarParams> = {}): SidebarParams {
  return {
    activeChannelType: "community",
    currentRoleLabel: "benevole",
    hasArrondissement: false,
    hasGreaterParisZone: false,
    effectiveZone: "",
    territoryFocus: null,
    messagesCount: 4,
    messagerieMode: false,
    chatNotificationUnreadCounts: createEmptyChatNotificationUnreadCounts(),
    channelTopics: communityTopics,
    activeTopicId: null,
    locale: "fr",
    resetComposerForChannelChange: vi.fn(),
    setActiveTopicId: vi.fn(),
    setActiveChannelType: vi.fn(),
    setIsDmThreadOpen: vi.fn(),
    ...overrides,
  };
}

function renderSidebar(overrides: Partial<SidebarParams> = {}) {
  let state!: SidebarState;
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <Probe params={baseParams(overrides)} onState={(nextState) => { state = nextState; }} />,
    );
  });
  return { renderer, getState: () => state };
}

function Probe({ params, onState }: { params: SidebarParams; onState: (state: SidebarState) => void }) {
  const state = useChatShellSidebar(params);
  onState(state);
  return null;
}

function channel(state: SidebarState, channelType: SidebarParams["activeChannelType"]) {
  return state.sidebarChannels.find((item) => item.channelType === channelType);
}

describe("useChatShellSidebar behavior", () => {
  it.each([
    ["member without territory context", "benevole", false, false, "", null, false],
    ["member with an arrondissement", "benevole", true, false, "Paris 11e arrondissement", 11, false],
    ["elected user", " elu ", false, false, "", null, true],
    ["admin with a Greater Paris zone", "ADMIN", false, true, "Boucle Nord", null, true],
  ] as const)(
    "projects channel access for %s",
    (_label, role, hasArrondissement, hasGreaterParisZone, effectiveZone, territoryFocus, adminAvailable) => {
      const { renderer, getState } = renderSidebar({
        currentRoleLabel: role,
        hasArrondissement,
        hasGreaterParisZone,
        effectiveZone,
        territoryFocus,
      });
      expect(channel(getState(), "community")?.disabled).toBe(false);
      expect(channel(getState(), "territory")?.disabled).toBe(false);
      expect(channel(getState(), "dm")?.disabled).toBe(false);
      expect(channel(getState(), "bug_report")?.disabled).toBe(false);
      expect(channel(getState(), "admin_elu")?.disabled).toBe(!adminAvailable);
      expect(channel(getState(), "admin_elu")?.isLocked).toBe(!adminAvailable);
      renderer.unmount();
    },
  );

  it("separates message counts from messagerie unread badges and preserves absent values", () => {
    const counts: ChatNotificationUnreadCounts = {
      ...createEmptyChatNotificationUnreadCounts(),
      community: 2,
      territory: 0,
      admin_elu: 5,
    };
    const { renderer, getState } = renderSidebar({
      activeChannelType: "territory",
      messagesCount: 9,
      messagerieMode: true,
      chatNotificationUnreadCounts: counts,
    });

    expect(getState().sidebarChannels.map((item) => item.count)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    expect(channel(getState(), "community")?.unreadCount).toBe(2);
    expect(channel(getState(), "territory")?.unreadCount).toBeUndefined();
    expect(channel(getState(), "admin_elu")?.unreadCount).toBe(5);
    expect(channel(getState(), "dm")?.unreadCount).toBeUndefined();
    renderer.unmount();

    const standard = renderSidebar({ activeChannelType: "community", messagesCount: 9 });
    expect(channel(standard.getState(), "community")?.count).toBe(9);
    expect(channel(standard.getState(), "territory")?.count).toBeUndefined();
    standard.renderer.unmount();

    const zeroBadges = renderSidebar({
      messagerieMode: true,
      chatNotificationUnreadCounts: createEmptyChatNotificationUnreadCounts(),
    });
    expect(channel(zeroBadges.getState(), "community")?.unreadCount).toBeUndefined();
    expect(channel(zeroBadges.getState(), "admin_elu")?.unreadCount).toBeUndefined();
    zeroBadges.renderer.unmount();
  });

  it("rejects a forbidden channel without resetting or changing any selection state", () => {
    const resetComposer = vi.fn();
    const setTopic = vi.fn();
    const setChannel = vi.fn();
    const setDmThread = vi.fn();
    const { renderer, getState } = renderSidebar({
      resetComposerForChannelChange: resetComposer,
      setActiveTopicId: setTopic,
      setActiveChannelType: setChannel,
      setIsDmThreadOpen: setDmThread,
    });

    act(() => { getState().handleSelectChannel("admin_elu"); });

    expect(resetComposer).not.toHaveBeenCalled();
    expect(setTopic).not.toHaveBeenCalled();
    expect(setChannel).not.toHaveBeenCalled();
    expect(setDmThread).not.toHaveBeenCalled();
    renderer.unmount();
  });

  it("resets topic/composer state for an allowed channel and closes only non-DM threads", () => {
    const resetComposer = vi.fn();
    const setTopic = vi.fn();
    const setChannel = vi.fn();
    const setDmThread = vi.fn();
    const { renderer, getState } = renderSidebar({
      activeTopicId: "relais_associatif",
      resetComposerForChannelChange: resetComposer,
      setActiveTopicId: setTopic,
      setActiveChannelType: setChannel,
      setIsDmThreadOpen: setDmThread,
    });

    act(() => { getState().handleSelectChannel("territory"); });
    expect(resetComposer).toHaveBeenCalledTimes(1);
    expect(setTopic).toHaveBeenCalledWith(null);
    expect(setChannel).toHaveBeenCalledWith("territory");
    expect(setDmThread).toHaveBeenCalledWith(false);

    resetComposer.mockClear();
    setTopic.mockClear();
    setChannel.mockClear();
    setDmThread.mockClear();
    act(() => { getState().handleSelectChannel("dm"); });
    expect(resetComposer).toHaveBeenCalledTimes(1);
    expect(setTopic).toHaveBeenCalledWith(null);
    expect(setChannel).toHaveBeenCalledWith("dm");
    expect(setDmThread).not.toHaveBeenCalled();
    renderer.unmount();
  });

  it("localizes topic groups, falls back for absent English values, and sums topic unreads", () => {
    const firstTopic = communityTopics[0]!;
    const fallbackTopic = {
      ...firstTopic,
      id: "besoin_ressources" as ChatTopicId,
      topicIds: ["besoin_ressources"] as const,
      label: "Ressources FR",
      labelEn: undefined,
      description: "Description FR",
      descriptionEn: undefined,
      starterPrompt: "Prompt FR",
      starterPromptEn: undefined,
    };
    const counts = {
      ...createEmptyChatNotificationUnreadCounts(),
      communityByTopic: {
        relais_associatif: 2,
        appel_aux_benevoles: 3,
        besoin_ressources: 0,
      },
    };
    const { renderer, getState } = renderSidebar({
      channelTopics: [firstTopic, fallbackTopic],
      activeTopicId: "relais_associatif",
      locale: "en",
      chatNotificationUnreadCounts: counts,
    });

    expect(getState().sidebarTopics[0]).toMatchObject({
      label: firstTopic.labelEn,
      description: firstTopic.descriptionEn,
      starterPrompt: firstTopic.starterPromptEn,
      active: true,
      unreadCount: 5,
    });
    expect(getState().sidebarTopics[1]).toMatchObject({
      label: "Ressources FR",
      description: "Description FR",
      starterPrompt: "Prompt FR",
      active: false,
      unreadCount: 0,
    });
    renderer.unmount();
  });

  it.each([
    ["community", "fr", "Salons proposés", "Raccourcis thématiques sans créer de nouveau canal."],
    ["community", "en", "Suggested rooms", "Thematic shortcuts without creating new channels."],
    ["territory", "fr", "Salons de zone", "Points locaux et coordination de voisinage."],
    ["territory", "en", "Area rooms", "Local points and nearby coordination."],
    ["admin_elu", "fr", "Sujets Admin & élus", "Arbitrages, priorités, suivi et coordination institutionnelle."],
    ["admin_elu", "en", "Admin & elected topics", "Trade-offs, priorities, follow-up and institutional coordination."],
    ["dm", "fr", null, null],
  ] as const)("returns the section copy for %s/%s", (channelType, locale, title, description) => {
    const { renderer, getState } = renderSidebar({
      activeChannelType: channelType,
      locale,
      channelTopics: [],
    });
    expect(getState().sidebarTopicSectionTitle).toBe(title);
    expect(getState().sidebarTopicSectionDescription).toBe(description);
    renderer.unmount();
  });

  it.each([
    ["community", "communityByTopic", 5],
    ["territory", "territoryByTopic", 7],
    ["admin_elu", "adminEluByTopic", 9],
  ] as const)("uses the unread map belonging to the active %s channel", (activeChannelType, mapKey, expectedUnread) => {
    const topic = getChatTopicPresentationGroups(activeChannelType)[0]!;
    const counts = createEmptyChatNotificationUnreadCounts();
    counts[mapKey][topic.topicIds[0]] = expectedUnread;
    const { renderer, getState } = renderSidebar({
      activeChannelType,
      channelTopics: [topic],
      chatNotificationUnreadCounts: counts,
    });
    expect(getState().sidebarTopics[0]?.unreadCount).toBe(expectedUnread);
    renderer.unmount();
  });

  it("does not expose topic unread counts for channels without thematic grouping", () => {
    const { renderer, getState } = renderSidebar({
      activeChannelType: "bug_report",
      channelTopics: [communityTopics[0]!],
    });
    expect(getState().sidebarTopics[0]?.unreadCount).toBeUndefined();
    expect(getState().sidebarTopicSectionTitle).toBeNull();
    expect(getState().sidebarTopicSectionDescription).toBeNull();
    renderer.unmount();
  });
});
