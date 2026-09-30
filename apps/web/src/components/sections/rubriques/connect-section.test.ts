import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { ConnectTabs, CONNECT_TABS } from "./connect-components";
import { getConnectShellNavigationStates } from "./connect-section-navigation";
import type { ChatShellNavigationState } from "@/components/chat/chat-navigation";
import { SitePreferencesProvider } from "@/components/ui/site-preferences-provider";

const connectSectionSource = readFileSync(
  new URL("./connect-section.tsx", import.meta.url),
  "utf8",
);
const connectSectionViewSource = readFileSync(
  new URL("./connect-section-view.tsx", import.meta.url),
  "utf8",
);
const connectNavigationSource = readFileSync(
  new URL("./connect-section-navigation.ts", import.meta.url),
  "utf8",
);
const connectImplementationSource = `${connectSectionSource}\n${connectSectionViewSource}\n${connectNavigationSource}`;
const chatShellSource = readFileSync(
  new URL("../../chat/chat-shell.tsx", import.meta.url),
  "utf8",
);
const chatShellLayoutSource = readFileSync(
  new URL("../../chat/chat-shell.layout.tsx", import.meta.url),
  "utf8",
);
const chatSidebarSource = readFileSync(
  new URL("../../chat/chat-sidebar.tsx", import.meta.url),
  "utf8",
) + readFileSync(
  new URL("../../chat/chat-sidebar-sections.tsx", import.meta.url),
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

function buildNavigationState(activeChannelType: ChatShellNavigationState["activeChannelType"]): ChatShellNavigationState {
  return {
    activeChannelType,
    activeTopicId: activeChannelType === "dm" ? null : "arbitrages",
    selectedActionId: activeChannelType === "dm" ? null : "action-1",
    selectedRecipient: null,
    selectedZone: "Paris",
    territoryFocus: 1,
    messageId: "message-1",
    feedbackId: null,
    contactRequestId: null,
    announcementTemplate: null,
    eventId: null,
  };
}

describe("Messagerie navigation shell", () => {
  it("keeps both tab shells mounted so tab round-trips retain local state", () => {
    expect(connectImplementationSource).toContain('data-connect-panel={tab}');
    expect(connectImplementationSource).toContain('panel("discussions"');
    expect(connectImplementationSource).toContain('panel("dm"');
    expect(connectImplementationSource).not.toContain("key={discussionShellKey}");
    expect(connectImplementationSource).not.toContain("key={dmShellKey}");
    expect(connectImplementationSource).toContain('surfaceActive: activeTab === "discussions"');
    expect(connectImplementationSource).toContain('surfaceActive: activeTab === "dm"');
  });

  it("uses a shell navigation contract for URL synchronization and restoration", () => {
    expect(connectImplementationSource).toContain("synchronizeConnectNavigationParams");
    expect(connectImplementationSource).toContain("onNavigationChange");
    expect(connectImplementationSource).toContain("router[historyMode]");
  });

  it("restores navigation only in the visible shell while preserving the hidden shell state", () => {
    const navigationState = buildNavigationState("action");
    const dmNavigation = buildNavigationState("dm");

    expect(getConnectShellNavigationStates("discussions", navigationState, dmNavigation)).toEqual({
      discussions: navigationState,
      dm: null,
    });
    expect(getConnectShellNavigationStates("dm", navigationState, dmNavigation)).toEqual({
      discussions: null,
      dm: dmNavigation,
    });
  });

  it("connects each rendered tab to its tabpanel in both directions", () => {
    const panels = CONNECT_TABS.map((tab) =>
      createElement("div", {
        key: tab.id,
        id: `connect-panel-${tab.id}`,
        role: "tabpanel",
        "aria-labelledby": `connect-tab-${tab.id}`,
      }),
    );
    const tabsAndPanels = createElement(
      "div",
      null,
      createElement(ConnectTabs, {
        activeTab: "discussions",
        setActiveTab: () => undefined,
        fr: true,
      }),
      ...panels,
    );
    const markup = renderToStaticMarkup(
      createElement(
        SitePreferencesProvider,
        {
          initialLocale: "fr",
          initialDisplayMode: "sobre",
        } as never,
        tabsAndPanels,
      )
    );

    for (const tab of CONNECT_TABS) {
      expect(markup).toMatch(
        new RegExp(`id="connect-tab-${tab.id}"[^>]*aria-controls="connect-panel-${tab.id}"`),
      );
      expect(markup).toContain(`id="connect-panel-${tab.id}"`);
      expect(markup).toContain(`aria-labelledby="connect-tab-${tab.id}"`);
    }
  });

  it("keeps the active indicator node in the initial DOM for every motion mode", () => {
    for (const initialDisplayMode of ["exhaustif", "sobre"] as const) {
      const markup = renderToStaticMarkup(
        createElement(
          SitePreferencesProvider,
          { initialLocale: "fr", initialDisplayMode } as never,
          createElement(ConnectTabs, {
            activeTab: "discussions",
            setActiveTab: () => undefined,
            fr: true,
          }),
        ),
      );

      expect(markup).toContain('aria-hidden="true" class="absolute inset-0');
    }
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
    expect(chatShellLayoutSource).toContain('onBackToContextList=');
    expect(chatShellLayoutSource).toContain('"hidden md:flex"');
    expect(channelButtonSource).toContain("<button");
    expect(channelButtonSource).toContain("focus-visible:ring-2");
    expect(chatActionSurfaceSource).toContain("focus-visible:ring-2");
  });

  it("uses the canonical page header, fluid shell height, and real tab semantics", () => {
    expect(connectImplementationSource).toContain("<PageHeader");
    expect(connectImplementationSource).not.toContain("action={<ConnectTabs");
    expect(connectImplementationSource).toContain("<ConnectTabs activeTab={activeTab}");
    expect(connectImplementationSource).not.toContain("h-[calc(100dvh-8.5rem)]");
    expect(connectImplementationSource).toContain('role="tabpanel"');
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
