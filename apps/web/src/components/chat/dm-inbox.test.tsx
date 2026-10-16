import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DmInbox } from "./dm-inbox";
import type { ActionShareContactRequest, DmConversation } from "./chat-types";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const conversation: DmConversation = {
  peer: {
    id: "peer-1",
    display_name: "Membre test",
    handle: "membre-test",
    avatar_url: null,
  },
  lastMessage: {
    id: "message-1",
    content: "Bonjour",
    createdAt: "2026-09-17T10:00:00.000Z",
    senderId: "peer-1",
    direction: "received",
  },
  unreadCount: 100,
};

function renderInbox(notificationUnreadCount = 100) {
  return renderToStaticMarkup(
    <DmInbox
      conversations={[conversation]}
      activePeerId={null}
      isLoading={false}
      onSelectConversation={() => undefined}
      onStartConversation={() => undefined}
      onRetry={() => undefined}
      notificationUnreadCount={notificationUnreadCount}
    />,
  );
}

describe("DmInbox count consumers", () => {
  it("preserves global and per-conversation values and labels while capping display", () => {
    const markup = renderInbox();

    expect(markup).toContain('aria-label="100 notifications privées non lues"');
    expect(markup).toContain('aria-label="100 messages non lus"');
    expect(markup.match(/>99\+<\/span>/g)).toHaveLength(2);
  });

  it("does not render a global counter when its value is zero", () => {
    const markup = renderInbox(0);

    expect(markup).not.toContain("notifications privées non lues");
    expect(markup).toContain('aria-label="100 messages non lus"');
  });

  it("opens member search in the conversations column", () => {
    const markup = renderToStaticMarkup(
      <DmInbox
        conversations={[conversation]}
        activePeerId={null}
        isLoading={false}
        onSelectConversation={() => undefined}
        onStartConversation={() => undefined}
        onRetry={() => undefined}
        isRecipientPickerOpen
        recipientQuery="ali"
        dmSuggestions={[{
          id: "peer-2",
          display_name: "Alice Test",
          handle: "alice-test",
          avatar_url: null,
        }]}
        onRecipientQueryChange={() => undefined}
        onSelectRecipient={() => undefined}
      />,
    );

    expect(markup).toContain("Rechercher un membre");
    expect(markup).toContain("Alice Test");
    expect(markup).toContain("@alice-test");
    expect(markup).not.toMatch(/autofocus/i);
  });

  it("focuses on picker opening and reopening, not on query updates or closing", () => {
    const focus = vi.fn();
    const createNodeMock = () => ({ focus });
    let renderer!: ReactTestRenderer;
    const baseProps = {
      conversations: [conversation],
      activePeerId: null,
      isLoading: false,
      onSelectConversation: () => undefined,
      onStartConversation: () => undefined,
      onRetry: () => undefined,
      onRecipientQueryChange: () => undefined,
      onSelectRecipient: () => undefined,
    };

    act(() => {
      renderer = create(<DmInbox {...baseProps} />, { createNodeMock });
      renderer.update(<DmInbox {...baseProps} isRecipientPickerOpen recipientQuery="" />);
    });
    expect(focus).toHaveBeenCalledTimes(1);

    act(() => {
      renderer.update(<DmInbox {...baseProps} isRecipientPickerOpen recipientQuery="ali" />);
    });
    expect(focus).toHaveBeenCalledTimes(1);

    act(() => {
      renderer.update(<DmInbox {...baseProps} isRecipientPickerOpen={false} />);
    });
    expect(focus).toHaveBeenCalledTimes(1);

    act(() => {
      renderer.update(<DmInbox {...baseProps} isRecipientPickerOpen />);
    });
    expect(focus).toHaveBeenCalledTimes(2);

    act(() => renderer.unmount());
  });

  it("does not focus a hidden picker when a recipient is already selected", () => {
    const focus = vi.fn();
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = create(
        <DmInbox
          conversations={[conversation]}
          activePeerId="peer-1"
          isLoading={false}
          onSelectConversation={() => undefined}
          onStartConversation={() => undefined}
          onRetry={() => undefined}
          isRecipientPickerOpen
        />,
        { createNodeMock: () => ({ focus }) },
      );
    });

    expect(focus).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it("groups first-contact requests without replacing the conversation list", () => {
    const request: ActionShareContactRequest = {
      id: "request-1",
      createdAt: "2026-09-17T10:00:00.000Z",
      message: "Peux-tu rejoindre cette action ?",
      sender: conversation.peer,
      action: {
        id: "action-1",
        shareKind: "invitation",
        title: "Action du canal",
        actionDate: "2026-09-20",
        eventStartTime: null,
        eventEndTime: null,
        locationLabel: "Paris 11e",
        organizerLabel: "Association test",
        participantsExpected: 4,
        durationMinutes: 60,
        objective: null,
        route: null,
        groupJoinEnabled: true,
        event: null,
      },
    };
    const markup = renderToStaticMarkup(
      <DmInbox
        conversations={[conversation]}
        activePeerId={null}
        isLoading={false}
        onSelectConversation={() => undefined}
        onStartConversation={() => undefined}
        onRetry={() => undefined}
        contactRequests={[request]}
        onRespondToContactRequest={async () => undefined}
      />,
    );

    expect(markup).toContain("Demandes (1)");
    expect(markup).toContain("Action du canal");
    expect(markup).toContain("Membre test");
    expect(markup).toContain("Bonjour");
  });
});
