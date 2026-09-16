import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DmInbox } from "./dm-inbox";
import type { DmConversation } from "./chat-types";

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
});
