import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ChatThreadPaneBody, type ChatThreadPaneBodyProps } from "./chat-thread-pane-body";

vi.mock("@/components/sections/rubriques/feedback-section", () => ({
  FeedbackSection: ({ pagePath, source }: { pagePath: string; source: string }) => (
    <div data-testid="feedback">{pagePath}:{source}</div>
  ),
}));
vi.mock("./chat-action-moderation", () => ({
  ChatActionModeration: ({ actionId }: { actionId: string }) => <div data-testid="moderation">{actionId}</div>,
}));
vi.mock("./topic-network-graph", () => ({
  TopicNetworkGraph: () => <div data-testid="graph" />,
}));
vi.mock("./ui/chat-message-feed", () => ({
  ChatMessageFeed: () => <div data-testid="feed" />,
}));
vi.mock("./chat-composer", () => ({
  ChatComposer: () => <div data-testid="composer" />,
}));

const baseProps = {
  pagePath: "/communaute",
  tone: "dark",
  messagerieMode: false,
  activeChannelType: "community",
  viewMode: "messages",
  isBugReportChannel: false,
  selectedActionId: null,
  selectedRecipient: null,
} as ChatThreadPaneBodyProps;

function renderBody(overrides: Partial<ChatThreadPaneBodyProps> = {}) {
  return renderToStaticMarkup(<ChatThreadPaneBody {...baseProps} {...overrides} />);
}

describe("ChatThreadPaneBody branch ownership", () => {
  it("routes action moderation before the feed when the action thread is selected", () => {
    const markup = renderBody({ activeChannelType: "action", selectedActionId: "action-42", messagerieMode: true });

    expect(markup).toContain('data-testid="moderation"');
    expect(markup).toContain("action-42");
    expect(markup).not.toContain('data-testid="feed"');
  });

  it("keeps feedback and graph presentation branches distinct from the message feed", () => {
    expect(renderBody({ isBugReportChannel: true })).toContain('data-testid="feedback"');
    expect(renderBody({ viewMode: "graph" })).toContain('data-testid="graph"');
    expect(renderBody({ isBugReportChannel: true, viewMode: "graph" })).not.toContain('data-testid="graph"');
  });

  it("renders the normal feed and composer branch for community messages", () => {
    const markup = renderBody();

    expect(markup).toContain('data-testid="feed"');
    expect(markup).toContain('data-testid="composer"');
  });
});
