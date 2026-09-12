"use client";

import type { NavigationSpace } from "@/lib/navigation";
import { getLocalizedText } from "@/lib/navigation";
import type { Locale } from "@/lib/ui/preferences";
import { getNavigationDropdownCardBorderTokens } from "./navigation-dropdown-border-theme";
import { NAVIGATION_DROPDOWN_CARD_GEOMETRY } from "./navigation-dropdown-card-theme";
import { getNavigationDropdownItemIcon } from "./navigation-dropdown-item-icon";
import { NavigationDropdownItemCard } from "./navigation-dropdown-item-card";
import {
  NAVIGATION_DROPDOWN_PANEL_CONTENT_CLASS_NAME,
  NAVIGATION_DROPDOWN_PANEL_LIST_CLASS_NAME,
  NAVIGATION_DROPDOWN_TITLE_CLASS_NAME,
} from "./navigation-dropdown-size-theme";
import {
  getNavigationDropdownItemIconClassName,
} from "./navigation-dropdown-accent-theme";
import {
  getNavigationDropdownTitleGradientStyle,
  getNavigationDropdownTitlePrefix,
} from "./navigation-dropdown-theme";

type NavigationDropdownContentProps = {
  locale: Locale;
  onTrackNavigation: (href: string, label: string, spaceId: string | null) => void;
  pathname: string;
  space: NavigationSpace;
};

export function NavigationDropdownContent({
  locale,
  onTrackNavigation,
  pathname,
  space,
}: NavigationDropdownContentProps) {
  return (
    <div className={NAVIGATION_DROPDOWN_PANEL_CONTENT_CLASS_NAME}>
      <header className="flex items-center justify-center">
        <h3 className={NAVIGATION_DROPDOWN_TITLE_CLASS_NAME}>
          <span className="text-black">{getNavigationDropdownTitlePrefix(locale)} </span>
          <span className="inline-block" style={getNavigationDropdownTitleGradientStyle(space.id)}>
            {getLocalizedText(space.label, locale, space.id)}
          </span>
        </h3>
      </header>

      <nav
        className={NAVIGATION_DROPDOWN_PANEL_LIST_CLASS_NAME}
        aria-label={getLocalizedText(space.label, locale, space.id)}
      >
        <ul className="space-y-1">
          {space.items.length > 0 ? (
            space.items.map((item) => (
              <NavigationDropdownItemCard
                key={item.id}
                item={item}
                locale={locale}
                pathname={pathname}
                spaceId={space.id}
                onTrackNavigation={onTrackNavigation}
                Icon={getNavigationDropdownItemIcon(item.routeId)}
                iconClassName={getNavigationDropdownItemIconClassName(space.id, item.routeId)}
                iconStrokeWidth={space.id === "visualize" ? 2.25 : 2.05}
                cardGeometry={NAVIGATION_DROPDOWN_CARD_GEOMETRY}
                cardBorderTokens={getNavigationDropdownCardBorderTokens(space.id, item.routeId)}
              />
            ))
          ) : (
            <li className="rounded-2xl border border-dashed border-black/16 px-3 py-3 text-[12px] text-black/80">
              {locale === "fr"
                ? "Aucune rubrique accessible pour ce bloc."
                : "No accessible pages for this block."}
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
