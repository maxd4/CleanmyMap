import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "../chat-types";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => React.createElement("img", props),
}));
vi.mock("framer-motion", () => ({
  motion: { div: (props: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("div", props) },
  useReducedMotion: () => false,
}));
vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ displayMode: "standard" }),
}));
vi.mock("./chat-action-reference-card", () => ({
  ChatActionReferenceCard: ({ actionId }: { actionId: string }) => React.createElement("div", { "data-action-reference": actionId }),
}));

import { ChatMessageItem } from "./chat-message-item";

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "message-1",
    sender_id: "peer-1",
    content: "Bonjour <script>alert(1)</script>",
    channel_type: "community",
    topic_id: null,
    message_kind: "message",
    related_event_id: null,
    action_id: null,
    related_event: null,
    poll_options: [],
    created_at: "2026-10-20T10:00:00.000Z",
    sender: {
      display_name: "Membre test",
      handle: "membre-test",
      avatar_url: "",
    },
    ...overrides,
  };
}

function textContent(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (!node || typeof node !== "object") return "";
  return textContent((node as { children?: unknown }).children);
}

function renderMessage(overrides: Partial<ChatMessage> = {}, props: Partial<React.ComponentProps<typeof ChatMessageItem>> = {}) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <ChatMessageItem
        message={message(overrides)}
        userId="user-1"
        tone="light"
        {...props}
      />,
    );
  });
  return renderer;
}

describe("ChatMessageItem behavior", () => {
  it("keeps received and sent identity observable and escapes message content", () => {
    const received = renderMessage({ attachment_url: "javascript:alert(1)", attachment_type: "text/plain" });
    expect(received.root.findByProps({ "data-chat-message-id": "message-1" })).toBeTruthy();
    expect(received.root.findAllByProps({ children: "Moi" })).toHaveLength(0);
    expect(textContent(received.toJSON())).toContain("Bonjour <script>alert(1)</script>");
    expect(received.root.findAllByType("a")).toHaveLength(0);
    received.unmount();

    const sent = renderMessage({ sender_id: "user-1", channel_type: "dm" });
    expect(sent.root.findAllByProps({ children: "Moi" })).toHaveLength(1);
    sent.unmount();
  });

  it("renders only safe document and image attachments", () => {
    const documentRenderer = renderMessage({
      channel_type: "dm",
      attachment_url: "https://cdn.example.test/private/report.pdf",
      attachment_type: "application/pdf",
    });
    const documentLink = documentRenderer.root.findByType("a");
    expect(documentLink.props.href).toBe("https://cdn.example.test/private/report.pdf");
    expect(documentLink.props.target).toBe("_blank");
    expect(documentLink.props.rel).toBe("noreferrer");
    documentRenderer.unmount();

    const imageRenderer = renderMessage({
      attachment_url: "https://cdn.example.test/photo.jpg",
      attachment_type: null,
    });
    const image = imageRenderer.root.findByType("img");
    expect(image.props.src).toBe("https://cdn.example.test/photo.jpg");
    expect(image.props.alt).toBe("Pièce jointe");
    imageRenderer.unmount();
  });

  it("exposes poll state, percentages, selection and pending vote controls", () => {
    const onPollVote = vi.fn();
    const renderer = renderMessage(
      {
        message_kind: "poll",
        totalVotes: 4,
        poll_options: [
          { id: "a", position: 1, label: "Oui", voteCount: 3 },
          { id: "b", position: 2, label: "Non", voteCount: 1 },
        ],
        selectedOptionId: "a",
      },
      { onPollVote, pollVotePending: true, pollVoteError: "Vote indisponible" },
    );
    const optionButtons = renderer.root.findAllByType("button");
    expect(optionButtons).toHaveLength(3);
    expect(optionButtons[0]?.props.disabled).toBe(true);
    expect(optionButtons[1]?.props.disabled).toBe(true);
    expect(optionButtons[2]?.props.disabled).toBe(true);
    expect(renderer.root.findByProps({ role: "alert" }).props.children).toBe("Vote indisponible");
    expect(textContent(renderer.toJSON())).toContain("75 %");
    renderer.unmount();

    const zeroVoteRenderer = renderMessage({
      message_kind: "poll",
      totalVotes: 0,
      poll_options: [{ id: "a", position: 1, label: "Oui" }, { id: "b", position: 2, label: "Non" }],
    }, { onPollVote });
    expect(textContent(zeroVoteRenderer.toJSON())).toContain("0 %");
    expect(onPollVote).not.toHaveBeenCalled();
    zeroVoteRenderer.unmount();
  });

  it("renders structured announcements and action references without inventing cards", () => {
    const renderer = renderMessage({
      message_kind: "announcement",
      topic_id: "relais_associatif",
      action_id: "action-1",
      related_event: {
        id: "event-1",
        title: "Nettoyage du quartier",
        event_date: "2026-10-21",
        location_label: "Paris 11e",
      },
    });
    expect(renderer.root.findByProps({ "data-action-reference": "action-1" })).toBeTruthy();
    expect(textContent(renderer.toJSON())).toContain("Annonce / Relai");
    expect(textContent(renderer.toJSON())).toContain("Cleanup associé");
    expect(textContent(renderer.toJSON())).toContain("Nettoyage du quartier");
    renderer.unmount();
  });
});
