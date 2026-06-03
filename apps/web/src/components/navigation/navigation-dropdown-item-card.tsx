"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import type { NavigationBlockId, NavigationItem } from "@/lib/navigation";
import { getLocalizedText } from "@/lib/navigation";
import type { Locale } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";
import type { NavigationDropdownCardBorderTokens } from "./navigation-dropdown-border-theme";
import type { NavigationDropdownCardGeometry } from "./navigation-dropdown-card-theme";
import { getNavigationDropdownItemTone } from "./navigation-dropdown-item-theme";
import { NavigationDropdownHelpText } from "./navigation-dropdown-help-text";
import {
  NAVIGATION_DROPDOWN_CARD_OUTER_HOVER_CLASS_NAME,
  NAVIGATION_DROPDOWN_CARD_OUTER_SHADOW_CLASS_NAME,
  NAVIGATION_DROPDOWN_ITEM_CONTENT_GAP_CLASS_NAME,
} from "./navigation-dropdown-size-theme";

type NavigationDropdownItemCardProps = {
  item: NavigationItem;
  locale: Locale;
  pathname: string;
  spaceId: NavigationBlockId | null;
  onTrackNavigation: (href: string, label: string, spaceId: string | null) => void;
  Icon: LucideIcon;
  iconClassName: string;
  iconStrokeWidth?: number;
  cardGeometry: NavigationDropdownCardGeometry;
  cardBorderTokens: NavigationDropdownCardBorderTokens;
};

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavigationDropdownItemCard({
  item,
  locale,
  pathname,
  spaceId,
  onTrackNavigation,
  Icon,
  iconClassName,
  iconStrokeWidth = 2.05,
  cardGeometry,
  cardBorderTokens,
}: NavigationDropdownItemCardProps) {
  const descriptionId = useId();
  const isActiveItem = isActivePath(pathname, item.href);
  const itemTone = getNavigationDropdownItemTone(spaceId, item.routeId);
  const itemLabel = getLocalizedText(item.label, locale, item.href);
  const itemDescription = getLocalizedText(item.description, locale, "");

  return (
    <li>
      <Link
        href={item.href}
        aria-current={isActiveItem ? "page" : undefined}
        aria-describedby={descriptionId}
        onClick={() => onTrackNavigation(item.href, itemLabel, spaceId)}
        style={isActiveItem ? cardBorderTokens.activeStyle : cardBorderTokens.inactiveStyle}
        className={cn(
          "group/item block w-full focus-visible:outline-none",
          cardBorderTokens.focusRing,
        )}
      >
        <div
          className={cn(
            cardGeometry.outerClassName,
            cardBorderTokens.outerClassName,
            NAVIGATION_DROPDOWN_CARD_OUTER_SHADOW_CLASS_NAME,
            NAVIGATION_DROPDOWN_CARD_OUTER_HOVER_CLASS_NAME,
          )}
        >
          <div
            className={cn(
              cardGeometry.bodyClassName,
              cardBorderTokens.bodyClassName,
            )}
          >
            <span
              className={cn(
                cardGeometry.iconClassName,
                iconClassName,
                cardBorderTokens.iconClassName,
              )}
            >
              <Icon className={cardGeometry.iconGlyphClassName} strokeWidth={iconStrokeWidth} aria-hidden="true" />
            </span>

            <span className={cn("flex min-w-0 flex-1 items-center", NAVIGATION_DROPDOWN_ITEM_CONTENT_GAP_CLASS_NAME)}>
              <span
                className={cn(cardGeometry.labelClassName, itemTone.labelClassName, "min-w-0 flex-1")}
                style={itemTone.labelStyle}
              >
                {itemLabel}
              </span>
              <NavigationDropdownHelpText id={descriptionId} text={itemDescription} />
            </span>

            <ChevronRight
              className={cn(cardGeometry.chevronClassName, cardBorderTokens.chevronClassName, itemTone.chevronClassName)}
              strokeWidth={2.8}
              aria-hidden="true"
            />
          </div>
        </div>
      </Link>
    </li>
  );
}
