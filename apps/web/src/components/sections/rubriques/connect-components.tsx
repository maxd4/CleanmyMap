"use client";

import { memo, useRef, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Hash, Mail } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { cn } from "@/lib/utils";
import type { ConnectTab, ConnectTabItem } from "./connect-types";

type TabTone = {
  active: string;
  icon: string;
  hoverText: string;
};

const TAB_TONES: Record<ConnectTab, TabTone> = {
  discussions: {
    active: "bg-rose-500",
    icon: "text-rose-600",
    hoverText: "hover:text-rose-700",
  },
  dm: {
    active: "bg-indigo-600",
    icon: "text-indigo-600",
    hoverText: "hover:text-indigo-700",
  },
};

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
  const { displayMode } = useSitePreferences();
  const reducedMotion = useReducedMotion();
  const tabRefs = useRef<Partial<Record<ConnectTab, HTMLButtonElement | null>>>({});
  const shouldAnimate = reducedMotion !== true && displayMode !== "sobre";

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
      className="flex w-full gap-1.5 rounded-[2rem] border border-rose-100 bg-white p-1.5 shadow-sm sm:w-auto"
      role="tablist"
      aria-label={fr ? "Sections de la messagerie" : "Messaging sections"}
    >
      {CONNECT_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const tone = TAB_TONES[tab.id];

        return (
          <CmmButton
            key={tab.id}
            tone="tertiary"
            variant="pill"
            role="tab"
            tabIndex={isActive ? 0 : -1}
            ariaControls={`connect-panel-${tab.id}`}
            ariaSelected={isActive}
            ref={(element) => {
              tabRefs.current[tab.id] = element;
            }}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={handleTabKeyDown}
            className={cn(
              "group relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-[1.5rem] px-3 py-3 transition-colors sm:flex-none sm:justify-start sm:gap-3 sm:px-6",
              isActive
                ? cn(tone.active, "border-transparent text-white hover:border-transparent")
                : cn("text-slate-700", tone.hoverText),
            )}
          >
            {shouldAnimate && isActive ? (
              <motion.span
                layoutId="connect-tab-active"
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-[1.5rem]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
              />
            ) : null}
            <tab.icon
              size={18}
              aria-hidden="true"
              className={cn(
                "transition-colors",
                isActive ? "text-white" : cn("text-slate-500", tone.icon),
              )}
            />
            <span className="relative z-10 text-left text-sm font-semibold leading-tight">
              {fr ? tab.label.fr : tab.label.en}
            </span>
          </CmmButton>
        );
      })}
    </div>
  );
});
