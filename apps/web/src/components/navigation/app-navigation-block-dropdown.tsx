"use client";

import {
  BarChart3,
  BookOpen,
  House,
  Map,
  MessageCircle,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { NavigationSpace } from "@/lib/navigation";
import { getLocalizedText } from "@/lib/navigation";
import type { Locale } from "@/lib/ui/preferences";
import { CmmDropdown } from "@/components/ui/cmm-dropdown";
import { CmmIcon } from "@/components/ui/cmm-icon";
import { DEFAULT_DROPDOWN_VERTICAL_GAP_PX } from "@/components/ui/use-dropdown-placement";
import { cn } from "@/lib/utils";
import { NavigationDropdownContent } from "./navigation-dropdown-content";
import { getNavigationDropdownShellTokens } from "./navigation-dropdown-shell-theme";
import { buildNavigationBlockTriggerStyle } from "./navigation-dropdown-accent-theme";
import { getNavigationBlockTriggerStateClassName } from "./navigation-block-trigger-state";

const NAVIGATION_DROPDOWN_HOVER_CLOSE_DELAY_MS = 160;

type AppNavigationBlockDropdownProps = {
  activeSpaceId: NavigationSpace["id"] | null;
  locale: Locale;
  onTrackNavigation: (href: string, label: string, spaceId: string | null) => void;
  onOpenChange: (spaceId: NavigationSpace["id"], open: boolean) => void;
  open: boolean;
  pathname: string;
  space: NavigationSpace;
};

function getNavigationBlockIcon(spaceId: NavigationSpace["id"]): LucideIcon {
  switch (spaceId) {
    case "home":
      return House;
    case "act":
      return Zap;
    case "visualize":
      return Map;
    case "impact":
      return BarChart3;
    case "network":
      return Users;
    case "connect":
      return MessageCircle;
    case "learn":
      return BookOpen;
    default:
      return House;
  }
}

export function AppNavigationBlockDropdown({
  activeSpaceId,
  locale,
  onTrackNavigation,
  onOpenChange,
  open,
  pathname,
  space,
}: AppNavigationBlockDropdownProps) {
  const shellTokens = getNavigationDropdownShellTokens(space.id);
  const isActiveSpace = space.id === activeSpaceId;

  function handleTrackNavigation(href: string, label: string, spaceId: string | null) {
    onOpenChange(space.id, false);
    onTrackNavigation(href, label, spaceId);
  }

  return (
    <CmmDropdown
      id={`block-${space.id}-menu`}
      ariaLabel={`${getLocalizedText(space.label, locale, space.id)} - ${locale === "fr" ? "rubriques" : "pages"}`}
      open={open}
      onOpenChange={(nextOpen) => onOpenChange(space.id, nextOpen)}
      panelRole="region"
      triggerHasPopup={null}
      verticalGap={DEFAULT_DROPDOWN_VERTICAL_GAP_PX}
      hoverCloseDelayMs={NAVIGATION_DROPDOWN_HOVER_CLOSE_DELAY_MS}
      panelClassName={shellTokens.className}
      panelStyle={shellTokens.style}
      renderTrigger={(triggerProps) => (
        <button
          {...triggerProps}
          data-navigation-block-trigger
          aria-label={getLocalizedText(space.label, locale, space.id)}
          style={buildNavigationBlockTriggerStyle(space.id)}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.8rem] border border-transparent bg-transparent leading-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-white/10",
            getNavigationBlockTriggerStateClassName({ isActiveSpace, isOpen: open }),
          )}
        >
          <CmmIcon icon={getNavigationBlockIcon(space.id)} size="lg" />
          <span className="sr-only">{getLocalizedText(space.label, locale, space.id)}</span>
        </button>
      )}
    >
      <NavigationDropdownContent
        locale={locale}
        onTrackNavigation={handleTrackNavigation}
        pathname={pathname}
        space={space}
      />

    </CmmDropdown>
  );
}
