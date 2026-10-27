import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatThreadPaneBody, type ChatThreadPaneBodyProps } from "./chat-thread-pane-body";

const moderationState = vi.hoisted(() => ({ visible: true }));

vi.mock("@/components/sections/rubriques/feedback-section", () => ({
  FeedbackSection: ({ pagePath, source }: { pagePath: string; source: string }) => (
    <div data-testid="feedback">{pagePath}:{source}</div>
  ),
}));
vi.mock("./chat-action-moderation", () => ({
  ChatActionModeration: ({ actionId }: { actionId: string }) => moderationState.visible ? <div data-testid="moderation">{actionId}</div> : null,
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
  beforeEach(() => {
    moderationState.visible = true;
  });

  it("renders action moderation, feed and composer in their original order", () => {
    const markup = renderBody({ activeChannelType: "action", selectedActionId: "action-42", messagerieMode: true });

    expect(markup).toContain('data-testid="moderation"');
    expect(markup).toContain("action-42");
    expect(markup).toContain('data-testid="feed"');
    expect(markup).toContain('data-testid="composer"');
    expect(markup.indexOf('data-testid="moderation"')).toBeLessThan(markup.indexOf('data-testid="feed"'));
    expect(markup.indexOf('data-testid="feed"')).toBeLessThan(markup.indexOf('data-testid="composer"'));
    expect(markup.match(/data-testid="feed"/g)).toHaveLength(1);
    expect(markup.match(/data-testid="composer"/g)).toHaveLength(1);
  });

  it("keeps the action conversation when moderation renders null", () => {
    moderationState.visible = false;

    const markup = renderBody({ activeChannelType: "action", selectedActionId: "action-42", messagerieMode: true });

    expect(markup).not.toContain('data-testid="moderation"');
    expect(markup).toContain('data-testid="feed"');
    expect(markup).toContain('data-testid="composer"');
  });

  it("renders action moderation before the graph view", () => {
    const markup = renderBody({ activeChannelType: "action", selectedActionId: "action-42", messagerieMode: true, viewMode: "graph" });

    expect(markup).toContain('data-testid="moderation"');
    expect(markup).toContain('data-testid="graph"');
    expect(markup).not.toContain('data-testid="feed"');
    expect(markup).not.toContain('data-testid="composer"');
    expect(markup.indexOf('data-testid="moderation"')).toBeLessThan(markup.indexOf('data-testid="graph"'));
  });

  it("does not add moderation without an action selection or messaging mode", () => {
    expect(renderBody({ activeChannelType: "action", selectedActionId: null, messagerieMode: true })).not.toContain('data-testid="moderation"');
    expect(renderBody({ activeChannelType: "action", selectedActionId: "action-42", messagerieMode: false })).not.toContain('data-testid="moderation"');
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
