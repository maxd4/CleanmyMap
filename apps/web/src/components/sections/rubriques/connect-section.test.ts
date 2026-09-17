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
});
