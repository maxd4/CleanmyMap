"use client";

import { useState } from "react";
import { ChevronDown, List } from "lucide-react";
import type { NavigationSpace } from "@/lib/navigation";
import type { Locale } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";
import { CmmDropdown } from "@/components/ui/cmm-dropdown";
import type { RibbonChrome } from "./app-navigation-ribbon-theme";
import { getNavigationDropdownPanelStyle } from "./navigation-dropdown-shell-theme";
import { NavigationTreeContent } from "./app-navigation-tree-menu.content";

type AppNavigationTreeMenuProps = {
  activeSpaceId: NavigationSpace["id"] | null;
  idBase: string;
  locale: Locale;
  onTrackNavigation: (href: string, label: string, spaceId: string | null) => void;
  pathname: string;
  ribbonChrome?: RibbonChrome; // conservé pour compatibilité, non utilisé
  spaces: NavigationSpace[];
};

export function AppNavigationTreeMenu({
  activeSpaceId,
  idBase,
  locale,
  onTrackNavigation,
  pathname,
  spaces,
}: AppNavigationTreeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSpaceId, setOpenSpaceId] = useState<NavigationSpace["id"] | null>(null);
  const panelStyle = getNavigationDropdownPanelStyle(activeSpaceId ?? spaces[0]?.id ?? null);

  return (
    <CmmDropdown
      id={`${idBase}-panel`}
      ariaLabel={locale === "fr" ? "Sommaire des sections et rubriques" : "Summary of sections and pages"}
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          setOpenSpaceId(activeSpaceId ?? spaces[0]?.id ?? null);
        }
      }}
      panelRole="region"
      triggerHasPopup="dialog"
      panelClassName="max-h-[calc(100vh-7rem)] w-[min(34rem,calc(100vw-1rem))] overflow-hidden rounded-[1.75rem] border text-black shadow-[0_28px_70px_-30px_rgba(15,23,42,0.24)]"
      panelStyle={panelStyle}
      renderTrigger={(triggerProps) => (
        <button
          {...triggerProps}
          aria-label={locale === "fr" ? "Sommaire" : "Summary"}
        className={cn(
          "inline-flex h-11 min-h-11 w-11 min-w-11 items-center justify-center gap-2 rounded-full border px-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent max-[380px]:h-10 max-[380px]:min-h-10 max-[380px]:w-10 max-[380px]:min-w-10 lg:h-auto lg:min-h-11 lg:w-auto lg:min-w-[9.5rem] lg:px-4",
          "border-cyan-200/24 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-white shadow-[0_18px_36px_-20px_rgba(20,184,166,0.5)] hover:border-cyan-100/40 hover:from-cyan-400 hover:via-teal-400 hover:to-emerald-400",
        )}
        >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
            "border-white/16 bg-white/14",
          )}
          aria-hidden="true"
        >
          <List className="h-4 w-4 shrink-0" aria-hidden="true" />
        </span>
        <span className="hidden cmm-text-caption font-bold uppercase tracking-[0.16em] lg:inline">
          {locale === "fr" ? "Sommaire" : "Summary"}
        </span>
          <ChevronDown
            className={cn(
              "hidden h-4 w-4 shrink-0 transition-transform lg:inline",
              isOpen && "rotate-180",
            )}
          aria-hidden="true"
        />
        </button>
      )}
    >
      <NavigationTreeContent
        activeSpaceId={activeSpaceId}
        idBase={idBase}
        locale={locale}
        onTrackNavigation={onTrackNavigation}
        pathname={pathname}
        spaces={spaces}
        openSpaceId={openSpaceId}
        setOpenSpaceId={setOpenSpaceId}
        onClose={() => setIsOpen(false)}
      />
    </CmmDropdown>
  );
}
