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
    expect(chatShellSource).toContain("getChatShellNavigationKey");
    expect(chatShellSource).toContain("setActiveFeedbackId(navigationState.feedbackId)");
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
      chatSidebarSource.indexOf('label: currentChannelType === "territory"'),
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
});
