import type { CSSProperties } from "react";
import type { NavigationBlockId } from "@/lib/navigation";
import {
  buildNavigationDropdownCardStyle,
  getNavigationDropdownItemAccent,
} from "./navigation-dropdown-accent-theme";

type NavigationDropdownCardBorderTokens = {
  outerClassName: string;
  bodyClassName: string;
  iconClassName: string;
  chevronClassName: string;
  focusRing: string;
  activeStyle: CSSProperties & Record<string, string>;
  inactiveStyle: CSSProperties & Record<string, string>;
};

const NAVIGATION_DROPDOWN_CARD_BORDER_CLASS_NAMES = {
  outer:
    "bg-[linear-gradient(90deg,var(--nav-outer-start)_0%,var(--nav-outer-mid)_46%,var(--nav-outer-end)_100%)] transition-all duration-200",
  body:
    "border border-[color:var(--nav-body-border)] bg-[color:var(--nav-body-bg)] transition-all duration-200 group-hover/item:border-[color:var(--nav-body-border-hover)] group-hover/item:bg-[color:var(--nav-body-bg-hover)] group-hover/item:ring-1 group-hover/item:ring-[color:var(--nav-body-ring)]",
  icon:
    "border-[color:var(--nav-icon-border)] text-[color:var(--nav-icon-color)]",
  chevron:
    "stroke-[2.35] text-black transition-[color,stroke-width] duration-200 group-hover/item:text-[color:var(--nav-chevron-hover)] group-hover/item:[stroke-width:2.95]",
};

function getNavigationDropdownCardBorderState(
  spaceId: NavigationBlockId | null,
  routeId?: string,
) {
  const accent = getNavigationDropdownItemAccent(spaceId, routeId);

  return {
    activeStyle: buildNavigationDropdownCardStyle(accent, true),
    inactiveStyle: buildNavigationDropdownCardStyle(accent, false),
  };
}

export function getNavigationDropdownCardBorderTokens(
  spaceId: NavigationBlockId | null,
  routeId?: string,
) {
  const state = getNavigationDropdownCardBorderState(spaceId, routeId);

  return {
    outerClassName: NAVIGATION_DROPDOWN_CARD_BORDER_CLASS_NAMES.outer,
    bodyClassName: NAVIGATION_DROPDOWN_CARD_BORDER_CLASS_NAMES.body,
    iconClassName: NAVIGATION_DROPDOWN_CARD_BORDER_CLASS_NAMES.icon,
    chevronClassName: NAVIGATION_DROPDOWN_CARD_BORDER_CLASS_NAMES.chevron,
    focusRing:
      "focus-visible:ring-2 focus-visible:ring-[color:var(--nav-focus-ring)]",
    activeStyle: state.activeStyle,
    inactiveStyle: state.inactiveStyle,
  } satisfies NavigationDropdownCardBorderTokens;
}

export type { NavigationDropdownCardBorderTokens };
