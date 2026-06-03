import type { CSSProperties } from "react";
import type { NavigationBlockId } from "@/lib/navigation";
import {
  buildNavigationDropdownShellStyle,
  getNavigationDropdownSpaceAccents,
} from "./navigation-dropdown-accent-theme";
import { NAVIGATION_DROPDOWN_SHELL_CLASS_NAME } from "./navigation-dropdown-size-theme";

type NavigationDropdownShellTokens = {
  className: string;
  style: CSSProperties;
};

export function getNavigationDropdownShellTokens(spaceId: NavigationBlockId | null) {
  const accents = getNavigationDropdownSpaceAccents(spaceId);

  return {
    className: NAVIGATION_DROPDOWN_SHELL_CLASS_NAME,
    style: buildNavigationDropdownShellStyle(accents),
  } satisfies NavigationDropdownShellTokens;
}

export function getNavigationDropdownPanelStyle(spaceId: NavigationBlockId | null) {
  return getNavigationDropdownShellTokens(spaceId).style;
}

export type { NavigationDropdownShellTokens };
