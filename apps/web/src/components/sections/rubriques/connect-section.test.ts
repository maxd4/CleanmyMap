import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const connectSectionSource = readFileSync(
  new URL("./connect-section.tsx", import.meta.url),
  "utf8",
);
const chatShellSource = readFileSync(
  new URL("../../chat/chat-shell.tsx", import.meta.url),
  "utf8",
);
const chatSidebarSource = readFileSync(
  new URL("../../chat/chat-sidebar.tsx", import.meta.url),
  "utf8",
);
const chatActionSurfaceSource = readFileSync(
  new URL("../../chat/chat-action-surface.tsx", import.meta.url),
  "utf8",
);
const channelButtonSource = readFileSync(
  new URL("../../chat/ui/channel-button.tsx", import.meta.url),
  "utf8",
);
const connectComponentsSource = readFileSync(
  new URL("./connect-components.tsx", import.meta.url),
  "utf8",
);
const chatHeaderSource = readFileSync(
  new URL("../../chat/chat-header.tsx", import.meta.url),
  "utf8",
);
const chatMessageItemSource = readFileSync(
  new URL("../../chat/ui/chat-message-item.tsx", import.meta.url),
  "utf8",
);
const topicGraphSource = readFileSync(
  new URL("../../chat/topic-network-graph.tsx", import.meta.url),
  "utf8",
);

describe("Messagerie navigation shell", () => {
  it("keeps both tab shells mounted so tab round-trips retain local state", () => {
    expect(connectSectionSource).toContain('data-connect-panel="discussions"');
    expect(connectSectionSource).toContain('data-connect-panel="dm"');
    expect(connectSectionSource).not.toContain("key={discussionShellKey}");
    expect(connectSectionSource).not.toContain("key={dmShellKey}");
  });

  it("uses a shell navigation contract for URL synchronization and restoration", () => {
    expect(connectSectionSource).toContain("synchronizeConnectNavigationParams");
    expect(connectSectionSource).toContain("onNavigationChange");
    expect(connectSectionSource).toContain("navigationState={activeTab ===");
    expect(connectSectionSource).toContain("router[historyMode]");
  });

  it("keeps the public surface vocabulary aligned with the primary tabs", () => {
    expect(chatSidebarSource).not.toContain("Canaux Publics");
    expect(chatSidebarSource).toContain("Discussions");
    expect(chatSidebarSource).toContain("Messages privés");
  });

  it("uses a compact desktop context list in the requested order", () => {
    expect(chatSidebarSource).toContain('compact={isMessagerie}');
    expect(chatSidebarSource).not.toContain("overflow-x-auto");
    expect(chatSidebarSource.indexOf('label: "Communauté globale"')).toBeLessThan(
      chatSidebarSource.indexOf('label: "Territoire"'),
    );
    expect(chatSidebarSource.indexOf("<ChatActionSurface")).toBeLessThan(
      chatSidebarSource.indexOf('label: "Admin & élus"'),
    );
    expect(chatSidebarSource).toContain("!adminEluChannel.disabled");
    expect(chatActionSurfaceSource).toContain("item.action_date");
    expect(chatActionSurfaceSource).toContain("item.location_label");
    expect(chatActionSurfaceSource).not.toContain("participants prévus");
    expect(chatActionSurfaceSource).not.toContain("extractEventRefFromNotes");
  });

  it("uses a mobile context-to-thread drill-down with keyboard-capable controls", () => {
    expect(chatShellSource).toContain("isPublicThreadOpen");
    expect(chatShellSource).toContain("showPublicThreadOnMobile");
    expect(chatShellSource).toContain('onBackToContextList=');
    expect(chatShellSource).toContain('"hidden md:flex"');
    expect(channelButtonSource).toContain("<button");
    expect(channelButtonSource).toContain("focus-visible:ring-2");
    expect(chatActionSurfaceSource).toContain("focus-visible:ring-2");
  });

  it("uses the canonical page header, fluid shell height, and real tab semantics", () => {
    expect(connectSectionSource).toContain("<PageHeader");
    expect(connectSectionSource).not.toContain("action={<ConnectTabs");
    expect(connectSectionSource).toContain("<ConnectTabs activeTab={activeTab}");
    expect(connectSectionSource).not.toContain("h-[calc(100dvh-8.5rem)]");
    expect(connectSectionSource).toContain('role="tabpanel"');
    expect(connectSectionSource).toContain("useReducedMotion");
    expect(connectComponentsSource).toContain('role="tablist"');
    expect(connectComponentsSource).toContain('role="tab"');
    expect(connectComponentsSource).toContain("ariaSelected={isActive}");
    expect(connectComponentsSource).toContain("ArrowRight");
  });

  it("keeps the light network palette and motion state discreet", () => {
    expect(connectComponentsSource).not.toContain("bg-fuchsia-500");
    expect(chatHeaderSource).not.toContain("animate-pulse");
    expect(chatHeaderSource).not.toContain("Actualisation");
    expect(chatHeaderSource).toContain('{isLive ? (');
    expect(chatMessageItemSource).toContain("useReducedMotion");
    expect(chatMessageItemSource).toContain('displayMode !== "sobre"');
    expect(topicGraphSource).toContain("useReducedMotion");
    expect(topicGraphSource).toContain('displayMode !== "sobre"');
  });
});
