"use client";

import { memo, useRef, type KeyboardEvent } from "react";
import { Hash, Mail } from "lucide-react";
import { tabItemClassName, tabStripClassName } from "@/components/ui/cmm-tab-strip.styles";
import { cn } from "@/lib/utils";
import type { ConnectTab, ConnectTabItem } from "./connect-types";

export const CONNECT_TABS: ConnectTabItem[] = [
  {
    id: "discussions",
    label: { fr: "Discussions", en: "Discussions" },
    icon: Hash,
    desc: {
      fr: "Communauté & Territoire",
      en: "Community & Territory",
    },
  },
  {
    id: "dm",
    label: { fr: "Messages privés", en: "Private messages" },
    icon: Mail,
    desc: {
      fr: "Confidentiel & Direct",
      en: "Confidential & Direct",
    },
  },
];

export const ConnectTabs = memo(function ConnectTabs({
  activeTab,
  setActiveTab,
  fr,
}: {
  activeTab: ConnectTab;
  setActiveTab: (tab: ConnectTab) => void;
  fr: boolean;
}) {
  const tabRefs = useRef<Partial<Record<ConnectTab, HTMLButtonElement | null>>>({});

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const currentIndex = CONNECT_TABS.findIndex((tab) => tab.id === activeTab);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? CONNECT_TABS.length - 1
          : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + CONNECT_TABS.length) % CONNECT_TABS.length;
    const nextTab = CONNECT_TABS[nextIndex].id;
    setActiveTab(nextTab);
    requestAnimationFrame(() => tabRefs.current[nextTab]?.focus());
  };

  return (
    <div
      className={cn(tabStripClassName("family", "grid-cols-2"), "sm:w-auto")}
      role="tablist"
      aria-label={fr ? "Sections de la messagerie" : "Messaging sections"}
    >
      {CONNECT_TABS.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            id={`connect-tab-${tab.id}`}
            type="button"
            role="tab"
            tabIndex={isActive ? 0 : -1}
            aria-controls={`connect-panel-${tab.id}`}
            aria-selected={isActive}
            ref={(element) => {
              tabRefs.current[tab.id] = element;
            }}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={handleTabKeyDown}
            className={cn(tabItemClassName("family", isActive), "gap-2.5")}
          >
            <tab.icon size={18} aria-hidden="true" className="shrink-0" />
            <span className="text-left text-sm font-semibold leading-tight">
              {fr ? tab.label.fr : tab.label.en}
            </span>
          </button>
        );
      })}
    </div>
  );
});
