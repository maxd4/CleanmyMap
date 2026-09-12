import type { CSSProperties } from "react";
import type { NavigationBlockId } from "@/lib/navigation";
import {
  buildNavigationDropdownGradientStyle,
  getNavigationDropdownItemAccent,
} from "./navigation-dropdown-accent-theme";

type NavigationDropdownItemTone = {
  labelClassName: string;
  labelStyle: CSSProperties;
  chevronClassName: string;
};

export function getNavigationDropdownItemTone(
  spaceId: NavigationBlockId | null,
  routeId?: string,
): NavigationDropdownItemTone {
  const accent = getNavigationDropdownItemAccent(spaceId, routeId);

  return {
    labelClassName:
      "bg-clip-text text-black group-hover/item:text-black group-focus-visible/item:text-black",
    labelStyle: buildNavigationDropdownGradientStyle([accent]),
    chevronClassName: "motion-safe:transition-colors motion-safe:duration-200",
  };
}
