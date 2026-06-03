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
      "bg-clip-text text-black transition-all duration-200 group-hover/item:text-transparent group-hover/item:[-webkit-text-fill-color:transparent] group-hover/item:font-bold group-hover/item:[filter:saturate(1.3)_brightness(1.06)]",
    labelStyle: buildNavigationDropdownGradientStyle([accent]),
    chevronClassName: "transition-[color,stroke-width] duration-200",
  };
}
