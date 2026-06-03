import type { NavigationBlockId } from "@/lib/navigation";
import type { Locale } from "@/lib/ui/preferences";
import {
  buildNavigationDropdownGradientStyle,
  getNavigationDropdownSpaceAccents,
} from "./navigation-dropdown-accent-theme";

export function getNavigationDropdownTitleGradientStyle(spaceId: NavigationBlockId | null) {
  return {
    ...buildNavigationDropdownGradientStyle(getNavigationDropdownSpaceAccents(spaceId)),
    WebkitTextFillColor: "transparent",
    color: "transparent",
  };
}

export function getNavigationDropdownTitleLabel(locale: Locale, label: string): string {
  return locale === "fr" ? `Bloc : ${label}` : `Block: ${label}`;
}

export function getNavigationDropdownTitlePrefix(locale: Locale): string {
  return locale === "fr" ? "Bloc :" : "Block:";
}
