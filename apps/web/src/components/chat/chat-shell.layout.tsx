import type { ComponentProps } from "react";
import { ChatSidebar } from "./chat-sidebar";
import { DmInbox } from "./dm-inbox";
import { ChatContextSidebar } from "./chat-context-sidebar";
import { ChatThreadPane, type ChatThreadPaneProps } from "./chat-thread-pane";

export type ChatShellLayoutProps = {
  fullHeight: boolean;
  isLight: boolean;
  messagerieMode: boolean;
  isDmSurface: boolean;
  showDmThreadOnMobile: boolean;
  showPublicThreadOnMobile: boolean;
  showThreadOnMobile: boolean;
  dmInboxProps: Omit<ComponentProps<typeof DmInbox>, "tone" | "className">;
  sidebarProps: Omit<ComponentProps<typeof ChatSidebar>, "tone" | "presentation" | "className">;
  threadProps: Omit<ChatThreadPaneProps, "showThreadOnMobile" | "tone">;
};

function getChatShellSurfaceClasses({
  fullHeight,
  isLight,
  messagerieMode,
}: Pick<ChatShellLayoutProps, "fullHeight" | "isLight" | "messagerieMode">) {
  return {
    tone: isLight ? "light" : "dark",
    outer: `flex flex-col ${fullHeight ? "h-full min-h-0" : "h-[750px]"} overflow-hidden relative ${isLight ? "bg-rose-50/30" : "rounded-[3rem] shadow-2xl backdrop-blur-3xl border border-white/10 bg-slate-900/40"}`,
    body: messagerieMode ? "flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row" : "flex min-h-0 flex-1 flex-row overflow-hidden",
  } as const;
}

function getChatShellVisibilityClasses({
  messagerieMode,
  showDmThreadOnMobile,
  showPublicThreadOnMobile,
  activeChannelType,
}: Pick<ChatShellLayoutProps, "messagerieMode" | "showDmThreadOnMobile" | "showPublicThreadOnMobile"> & {
  activeChannelType: ChatThreadPaneProps["activeChannelType"];
}) {
  return {
    dmInbox: !showDmThreadOnMobile ? "flex" : "hidden md:flex",
    sidebar: !showPublicThreadOnMobile ? "flex" : "hidden md:flex",
    showContextSidebar: !messagerieMode && activeChannelType !== "dm" && activeChannelType !== "bug_report",
  } as const;
}

export function ChatShellLayout({
  fullHeight,
  isLight,
  messagerieMode,
  isDmSurface,
  showDmThreadOnMobile,
  showPublicThreadOnMobile,
  showThreadOnMobile,
  dmInboxProps,
  sidebarProps,
  threadProps,
}: ChatShellLayoutProps) {
  const surfaceClasses = getChatShellSurfaceClasses({
    fullHeight,
    isLight,
    messagerieMode,
  });
  const visibilityClasses = getChatShellVisibilityClasses({
    messagerieMode,
    showDmThreadOnMobile,
    showPublicThreadOnMobile,
    activeChannelType: threadProps.activeChannelType,
  });
  return (
    <div className={surfaceClasses.outer}>
      <div className={surfaceClasses.body}>
        {isDmSurface ? (
          <DmInbox
            {...dmInboxProps}
            tone={surfaceClasses.tone}
            className={visibilityClasses.dmInbox}
          />
        ) : (
          <ChatSidebar
            {...sidebarProps}
            tone={surfaceClasses.tone}
            presentation={messagerieMode ? "messagerie" : "default"}
            className={visibilityClasses.sidebar}
          />
        )}
        <ChatThreadPane
          {...threadProps}
          tone={surfaceClasses.tone}
          showThreadOnMobile={showThreadOnMobile}
          onBackToDmInbox={isDmSurface && showDmThreadOnMobile ? threadProps.onBackToDmInbox : undefined}
          onBackToContextList={messagerieMode && !isDmSurface && showPublicThreadOnMobile ? threadProps.onBackToContextList : undefined}
        />
        {visibilityClasses.showContextSidebar ? (
          <ChatContextSidebar tone={isLight ? "light" : "dark"} />
        ) : null}
      </div>
    </div>
  );
}
