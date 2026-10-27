import * as React from "react";
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { MessageSquare } from "lucide-react";
import type { ChatSearchResult } from "@/lib/chat/chat-search";
import type { ChatUser } from "./chat-types";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

type ButtonProps = { onClick: () => void; disabled?: boolean; children?: React.ReactNode };
type InputProps = { onChange: (event: React.ChangeEvent<HTMLInputElement>) => void; value?: string };

function propsOf<Props>(node: ReactTestInstance): Props {
  return node.props as unknown as Props;
}

vi.mock("./chat-search-panel", () => ({
  ChatSearchPanel: (props: {
    query: string;
    onQueryChange: (value: string) => void;
    onClose: () => void;
    onSelectResult: (result: ChatSearchResult) => void;
    onLoadMore: () => void;
    results: ChatSearchResult[];
  }) => (
    <div data-chat-search-panel="true">
      <input aria-label="recherche de messages" value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} />
      <button type="button" onClick={props.onClose}>Fermer recherche</button>
      <button type="button" onClick={() => props.onSelectResult(props.results[0]!)}>Sélectionner résultat</button>
      <button type="button" onClick={props.onLoadMore}>Charger recherche</button>
    </div>
  ),
}));

import { ChatHeader } from "./chat-header";

const recipient: ChatUser = {
  id: "user-2",
  display_name: "Alice Test",
  handle: "alice",
  avatar_url: null,
};

const searchResult: ChatSearchResult = {
  messageId: "message-1",
  excerpt: "Résultat",
  author: { displayName: "Alice Test", handle: "alice", avatarUrl: null },
  createdAt: "2026-10-20T10:00:00.000Z",
  channelType: "dm",
  messageKind: "message",
  topicId: null,
};

function renderHeader(overrides: Partial<React.ComponentProps<typeof ChatHeader>> = {}) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <ChatHeader
        activeChannelType="dm"
        activeChannelLabel="Messages privés"
        activeChannelDescription="Conversation directe"
        activeChannelIcon={MessageSquare}
        metaItems={[{ label: "Zone", value: "Paris 11e" }]}
        viewMode="messages"
        isBugReportChannel={false}
        selectedRecipient={recipient}
        isEditingHandle={false}
        newHandle="alice"
        onViewModeChange={vi.fn()}
        onToggleHandleEditor={vi.fn()}
        onHandleChange={vi.fn()}
        onConfirmHandle={vi.fn(async () => undefined)}
        {...overrides}
      />,
    );
  });
  return renderer;
}

describe("ChatHeader behavior", () => {
  it("routes view, identity, metadata and back callbacks through real controls", async () => {
    const onViewModeChange = vi.fn();
    const onToggleHandleEditor = vi.fn();
    const onHandleChange = vi.fn();
    const onConfirmHandle = vi.fn(async () => undefined);
    const onBack = vi.fn();
    const renderer = renderHeader({ onViewModeChange, onToggleHandleEditor, onHandleChange, onConfirmHandle, onBackToDmInbox: onBack, isLive: true });

    expect(renderer.root.findByProps({ children: "Direct" })).toBeTruthy();
    expect(JSON.stringify(renderer.toJSON())).toContain("Conversation avec");

    const graph = renderer.root.findByProps({ "aria-label": "Afficher le graphe" });
    await act(async () => { propsOf<ButtonProps>(graph).onClick(); });
    expect(onViewModeChange).toHaveBeenCalledWith("graph");

    const handleButton = renderer.root.findByProps({ "aria-label": "Modifier le pseudo" });
    await act(async () => { propsOf<ButtonProps>(handleButton).onClick(); });
    expect(onToggleHandleEditor).toHaveBeenCalledTimes(1);

    const metadataButton = renderer.root.findByProps({ "aria-label": "Afficher les métadonnées" });
    await act(async () => { propsOf<ButtonProps>(metadataButton).onClick(); });
    expect(renderer.root.findByProps({ children: "Zone" })).toBeTruthy();

    const backButton = renderer.root.findByProps({ "aria-label": "Retour aux conversations" });
    await act(async () => { propsOf<ButtonProps>(backButton).onClick(); });
    expect(onBack).toHaveBeenCalledTimes(1);

    act(() => renderer.update(<ChatHeader
      activeChannelType="dm"
      activeChannelLabel="Messages privés"
      activeChannelDescription="Conversation directe"
      activeChannelIcon={MessageSquare}
      metaItems={[]}
      viewMode="messages"
      isBugReportChannel={false}
      selectedRecipient={recipient}
      isEditingHandle
      newHandle="nouveau"
      onViewModeChange={onViewModeChange}
      onToggleHandleEditor={onToggleHandleEditor}
      onHandleChange={onHandleChange}
      onConfirmHandle={onConfirmHandle}
    />));
    const input = renderer.root.findByProps({ "aria-label": "Votre pseudo unique" });
    await act(async () => { propsOf<InputProps>(input).onChange({ target: { value: "nouveau-2" } } as React.ChangeEvent<HTMLInputElement>); });
    expect(onHandleChange).toHaveBeenCalledWith("nouveau-2");
    await act(async () => { propsOf<ButtonProps>(renderer.root.findByProps({ children: "Confirmer" })).onClick(); });
    expect(onConfirmHandle).toHaveBeenCalledTimes(1);
    renderer.unmount();
  });

  it("disables view switching for feedback and keeps optional controls hidden", () => {
    const onViewModeChange = vi.fn();
    const renderer = renderHeader({
      activeChannelType: "bug_report",
      isBugReportChannel: true,
      selectedRecipient: null,
      onViewModeChange,
    });
    expect(renderer.root.findByProps({ "aria-label": "Afficher les messages" }).props.disabled).toBe(true);
    expect(renderer.root.findByProps({ "aria-label": "Afficher le graphe" }).props.disabled).toBe(true);
    act(() => renderer.update(<ChatHeader
      activeChannelType="bug_report"
      activeChannelLabel="Feedback"
      activeChannelDescription="Signaler un problème"
      activeChannelIcon={MessageSquare}
      metaItems={[]}
      viewMode="messages"
      isBugReportChannel
      selectedRecipient={null}
      isEditingHandle={false}
      newHandle=""
      showControls={false}
      onViewModeChange={onViewModeChange}
      onToggleHandleEditor={vi.fn()}
      onHandleChange={vi.fn()}
      onConfirmHandle={vi.fn(async () => undefined)}
    />));
    expect(renderer.root.findAllByProps({ "aria-label": "Modifier le pseudo" })).toHaveLength(0);
    renderer.unmount();
  });

  it("delegates one identity confirmation to the stateful owner", () => {
    const onConfirmHandle = vi.fn();
    const renderer = renderHeader({ isEditingHandle: true, onConfirmHandle });
    const confirm = renderer.root.findByProps({ children: "Confirmer" });

    act(() => { propsOf<ButtonProps>(confirm).onClick(); });
    expect(onConfirmHandle).toHaveBeenCalledOnce();
    renderer.unmount();
  });

  it("wires search controls only when the complete search contract is present", async () => {
    const callbacks = {
      onToggleSearch: vi.fn(),
      onSearchQueryChange: vi.fn(),
      onCloseSearch: vi.fn(),
      onSelectSearchResult: vi.fn(),
      onLoadMoreSearch: vi.fn(),
    };
    const renderer = renderHeader({
      showSearch: true,
      isSearchOpen: true,
      searchQuery: "map",
      searchResults: [searchResult],
      ...callbacks,
    });
    await act(async () => { propsOf<ButtonProps>(renderer.root.findByProps({ "aria-label": "Fermer la recherche" })).onClick(); });
    expect(callbacks.onToggleSearch).toHaveBeenCalledTimes(1);
    await act(async () => { propsOf<InputProps>(renderer.root.findByProps({ "aria-label": "recherche de messages" })).onChange({ target: { value: "maps" } } as React.ChangeEvent<HTMLInputElement>); });
    expect(callbacks.onSearchQueryChange).toHaveBeenCalledWith("maps");
    await act(async () => { propsOf<ButtonProps>(renderer.root.findByProps({ children: "Sélectionner résultat" })).onClick(); });
    expect(callbacks.onSelectSearchResult).toHaveBeenCalledWith(searchResult);
    await act(async () => { propsOf<ButtonProps>(renderer.root.findByProps({ children: "Charger recherche" })).onClick(); });
    expect(callbacks.onLoadMoreSearch).toHaveBeenCalledTimes(1);
    renderer.unmount();
  });
});
