"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Hash, Mail } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";
import type { ConnectTab, ConnectTabItem } from "./connect-types";

type TabTone = {
  active: string;
  icon: string;
  hoverText: string;
  subtitle: string;
};

const TAB_TONES: Record<ConnectTab, TabTone> = {
  discussions: {
    active: "bg-rose-500",
    icon: "text-rose-500",
    hoverText: "hover:text-rose-600",
    subtitle: "group-hover:text-rose-400",
  },
  dm: {
    active: "bg-fuchsia-500",
    icon: "text-fuchsia-500",
    hoverText: "hover:text-fuchsia-600",
    subtitle: "group-hover:text-fuchsia-400",
  },
};

export const CONNECT_TABS: ConnectTabItem[] = [
  {
    id: "discussions",
    label: { fr: "Canaux Publics", en: "Public Channels" },
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
  return (
    <div className="flex w-full gap-1.5 rounded-[2rem] border border-rose-100 bg-white p-1.5 shadow-sm sm:w-auto">
      {CONNECT_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const tone = TAB_TONES[tab.id];

        return (
          <CmmButton
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={isActive}
            tone={isActive ? "primary" : "tertiary"}
            variant="pill"
            className={cn(
              "group relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-[1.5rem] px-3 py-3 transition-all duration-300 sm:flex-none sm:justify-start sm:gap-3 sm:px-6",
              isActive ? "text-white" : cn("text-slate-600", tone.hoverText),
            )}
          >
            {isActive && (
              <motion.div
                layoutId="connect-tab-active"
                className={cn("absolute inset-0 -z-10 shadow-sm", tone.active)}
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
            <tab.icon
              size={18}
              className={cn(
                "transition-transform group-hover:scale-110",
                isActive ? "text-white" : cn("text-slate-500", tone.icon),
              )}
            />
            <div className="relative z-10 text-left">
              <span className="block text-[11px] font-black uppercase tracking-widest">
                {fr ? tab.label.fr : tab.label.en}
              </span>
              <span
                className={cn(
                  "mt-0.5 hidden text-[9px] font-black uppercase tracking-[0.2em] sm:block",
                  isActive ? "text-white" : cn("text-slate-400", tone.subtitle),
                )}
              >
                {fr ? tab.desc.fr : tab.desc.en}
              </span>
            </div>
          </CmmButton>
        );
      })}
    </div>
  );
});
