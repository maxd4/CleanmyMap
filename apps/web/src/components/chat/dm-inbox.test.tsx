import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DmInbox } from "./dm-inbox";
import type { ActionShareContactRequest, DmConversation } from "./chat-types";

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
