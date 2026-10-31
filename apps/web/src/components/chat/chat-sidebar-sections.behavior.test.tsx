import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { ChatSidebarChannel, ChatSidebarTopic } from "./chat-sidebar";
import { ChatSidebarContent } from "./chat-sidebar-sections";

vi.mock("@/components/ui/cmm-count-badge", () => ({
  CmmCountBadge: ({ count }: { count: number }) => <span data-testid="count">{count}</span>,
}));
vi.mock("./ui/channel-button", () => ({
  ChannelButton: ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) => (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick}>{label}</button>
  ),
}));
vi.mock("./chat-action-surface", () => ({
  ChatActionSurface: () => <div data-testid="action-surface">Actions</div>,
}));
vi.mock("./chat-territory-selector", () => ({
  ChatTerritorySelector: () => <div data-testid="territory-selector">Territoire</div>,
}));

const Icon = () => null;

const channels: ChatSidebarChannel[] = [
  { channelType: "community", active: true, disabled: false, icon: Icon as unknown as ChatSidebarChannel["icon"], label: "Community", description: "Global", count: 2, unreadCount: 3, accentClass: "", chipClass: "", isLocked: false },
  { channelType: "territory", active: false, disabled: false, icon: Icon as unknown as ChatSidebarChannel["icon"], label: "Territory", description: "Local", count: 1, unreadCount: 1, accentClass: "", chipClass: "", isLocked: false },
  { channelType: "admin_elu", active: false, disabled: true, icon: Icon as unknown as ChatSidebarChannel["icon"], label: "Admin", description: "Restricted", count: 0, unreadCount: 0, accentClass: "", chipClass: "", isLocked: true },
  { channelType: "dm", active: false, disabled: false, icon: Icon as unknown as ChatSidebarChannel["icon"], label: "DM", description: "Private", count: 4, unreadCount: 2, accentClass: "", chipClass: "", isLocked: false },
];

const topics: ChatSidebarTopic[] = [{
  id: "relais_associatif" as ChatSidebarTopic["id"],
  label: "Sujet général",
  description: "Échanges ouverts",
  starterPrompt: "Je cherche un relais.",
  accentClassName: "accent",
  topicIds: ["relais_associatif"],
  icon: Icon as unknown as ChatSidebarTopic["icon"],
  active: true,
  unreadCount: 5,
}];

function props(overrides: Partial<Parameters<typeof ChatSidebarContent>[0]> = {}): Parameters<typeof ChatSidebarContent>[0] {
  return {
    channels,
    currentChannelType: "community",
    isLight: true,
    isMessagerie: false,
    onSelectChannel: vi.fn(),
    onSelectTopic: vi.fn(),
    topicSectionTitle: "Thèmes",
    topicSectionDescription: "Choisissez un thème",
    topics,
    tone: "light",
    actionItems: [],
    activeActionId: null,
    actionLoading: false,
    actionError: null,
    currentZone: "Paris",
    profileDefaultZone: "Paris",
    onSelectZone: vi.fn(),
    ...overrides,
  };
}

describe("ChatSidebarContent behavior", () => {
  it("keeps disabled privileged channels out of the interactive surface", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<ChatSidebarContent {...props()} />); });
    expect(renderer.root.findAllByProps({ "aria-label": "Admin" })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ "aria-label": "Communauté globale" })).toHaveLength(1);
    expect(renderer.root.findAllByProps({ "data-testid": "count" }).map((item) => item.props.children)).toContain(5);
    renderer.unmount();
  });

  it("routes active topic selections through the current channel first", () => {
    const onSelectChannel = vi.fn();
    const onSelectTopic = vi.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<ChatSidebarContent {...props({ onSelectChannel, onSelectTopic })} />); });
    const topicButton = renderer.root.findAllByType("button").find((button) => button.props["aria-pressed"] === true);
    expect(topicButton).toBeDefined();
    act(() => { topicButton?.props.onClick(); });
    expect(onSelectChannel).toHaveBeenCalledWith("community");
    expect(onSelectTopic).toHaveBeenCalledWith("relais_associatif");
    renderer.unmount();
  });

  it("switches the sidebar projection for messagerie without exposing unrelated private sections", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<ChatSidebarContent {...props({ isMessagerie: true })} />); });
    expect(renderer.root.findAllByProps({ "data-testid": "action-surface" })).toHaveLength(1);
    expect(renderer.root.findAllByProps({ "aria-label": "Messages privés" })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ children: "Impact ensemble" })).toHaveLength(0);
    renderer.unmount();
  });
});
