"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BarChart3,
  ChevronRight,
  Info,
  MapPinned,
  Medal,
} from "lucide-react";
import type { NavigationSpace } from "@/lib/navigation";
import { getLocalizedText } from "@/lib/navigation";
import type { Locale } from "@/lib/ui/preferences";
import { CmmDropdown } from "@/components/ui/cmm-dropdown";
import { DEFAULT_DROPDOWN_VERTICAL_GAP_PX } from "@/components/ui/use-dropdown-placement";
import { cn } from "@/lib/utils";
import { AppNavigationBlockDropdownAct } from "./app-navigation-block-dropdown-act";
import { AppNavigationBlockDropdownHome } from "./app-navigation-block-dropdown-home";
import type { RibbonChrome } from "./app-navigation-ribbon-theme";
import { AppNavigationBlockDropdownLearn } from "./app-navigation-block-dropdown-learn";
import { AppNavigationBlockDropdownNetwork } from "./app-navigation-block-dropdown-network";
import { NavigationDropdownItemCard } from "./navigation-dropdown-item-card";
import { NavigationDropdownHelpText } from "./navigation-dropdown-help-text";
import { getNavigationDropdownCardBorderTokens } from "./navigation-dropdown-border-theme";
import { getNavigationDropdownCardGeometry } from "./navigation-dropdown-card-theme";
import { getNavigationDropdownItemTone } from "./navigation-dropdown-item-theme";
import { getNavigationDropdownShellTokens } from "./navigation-dropdown-shell-theme";
import { getNavigationDropdownItemIconClassName } from "./navigation-dropdown-accent-theme";
import {
  NAVIGATION_DROPDOWN_PANEL_CONTENT_CLASS_NAME,
  NAVIGATION_DROPDOWN_PANEL_LIST_CLASS_NAME,
  NAVIGATION_DROPDOWN_PANEL_SCROLL_LIST_CLASS_NAME,
  NAVIGATION_DROPDOWN_TITLE_CLASS_NAME,
  NAVIGATION_DROPDOWN_CARD_LABEL_CLASS_NAME,
  NAVIGATION_DROPDOWN_ITEM_LINK_GAP_CLASS_NAME,
} from "./navigation-dropdown-size-theme";
import {
  getNavigationDropdownTitleGradientStyle,
  getNavigationDropdownTitlePrefix,
} from "./navigation-dropdown-theme";

const NAVIGATION_DROPDOWN_HOVER_CLOSE_DELAY_MS = 160;

type AppNavigationBlockDropdownProps = {
  activeSpaceId: NavigationSpace["id"] | null;
  locale: Locale;
  onTrackNavigation: (href: string, label: string, spaceId: string | null) => void;
  pathname: string;
  ribbonChrome?: RibbonChrome; // conservé pour compatibilité, non utilisé
  space: NavigationSpace;
};

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
function getVisualizeItemIcon(routeId: string) {
  switch (routeId) {
    case "map":
      return MapPinned;
    case "reports":
      return BarChart3;
    case "gamification":
      return Medal;
    case "methodologie":
      return Info;
    default:
      return ChevronRight;
  }
}

export function AppNavigationBlockDropdown({
  activeSpaceId,
  locale,
  onTrackNavigation,
  pathname,
  space,
}: AppNavigationBlockDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const shellTokens = getNavigationDropdownShellTokens(space.id);
  const cardGeometry = getNavigationDropdownCardGeometry(space.id);
  const isActiveSpace = space.id === activeSpaceId;
  const isHomeSpace = space.id === "home";
  const isActSpace = space.id === "act";
  const isVisualizeSpace = space.id === "visualize";
  const isNetworkSpace = space.id === "network";
  const isLearnSpace = space.id === "learn";

  function handleTrackNavigation(href: string, label: string, spaceId: string | null) {
    setIsOpen(false);
    onTrackNavigation(href, label, spaceId);
  }

  return (
    <CmmDropdown
      id={`block-${space.id}-menu`}
      ariaLabel={`${getLocalizedText(space.label, locale, space.id)} - ${locale === "fr" ? "rubriques" : "pages"}`}
      open={isOpen}
      onOpenChange={setIsOpen}
      panelRole="region"
      triggerHasPopup={null}
      verticalGap={DEFAULT_DROPDOWN_VERTICAL_GAP_PX}
      hoverCloseDelayMs={NAVIGATION_DROPDOWN_HOVER_CLOSE_DELAY_MS}
      panelClassName={shellTokens.className}
      panelStyle={shellTokens.style}
      renderTrigger={(triggerProps) => (
        <button
          {...triggerProps}
          aria-label={getLocalizedText(space.label, locale, space.id)}
          className={cn(
            "group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.8rem] border border-transparent bg-transparent text-[20px] leading-none transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
            isActiveSpace
              ? "bg-white/[0.08] text-white"
              : "text-white hover:bg-white/[0.07] hover:text-white",
          )}
        >
          <span className="select-none" aria-hidden="true">
            {space.icon}
          </span>
          <span className="sr-only">{getLocalizedText(space.label, locale, space.id)}</span>
        </button>
      )}
    >
              {isVisualizeSpace ? (
                <div className={NAVIGATION_DROPDOWN_PANEL_CONTENT_CLASS_NAME}>
                  <header className="flex items-center justify-center">
                    <h3 className={NAVIGATION_DROPDOWN_TITLE_CLASS_NAME}>
                      <span className="text-slate-950">{getNavigationDropdownTitlePrefix(locale)} </span>
                      <span
                        className="inline-block"
                        style={getNavigationDropdownTitleGradientStyle(space.id)}
                      >
                        {getLocalizedText(space.label, locale, space.id)}
                      </span>
                    </h3>
                  </header>

                  <nav className={NAVIGATION_DROPDOWN_PANEL_LIST_CLASS_NAME} aria-label={getLocalizedText(space.label, locale, space.id)}>
                    <ul className="space-y-1">
                      {space.items.length > 0 ? (
                        space.items.map((item) => {
                          const Icon = getVisualizeItemIcon(item.routeId);
                          const itemBorderTokens = getNavigationDropdownCardBorderTokens(
                            space.id,
                            item.routeId,
                          );
                          const itemIconClassName = getNavigationDropdownItemIconClassName(
                            space.id,
                            item.routeId,
                          );
                          return (
                            <NavigationDropdownItemCard
                              key={item.id}
                              item={item}
                              locale={locale}
                              pathname={pathname}
                              spaceId={space.id}
                              onTrackNavigation={handleTrackNavigation}
                              Icon={Icon}
                              iconClassName={itemIconClassName}
                              iconStrokeWidth={2.25}
                              cardGeometry={cardGeometry}
                              cardBorderTokens={itemBorderTokens}
                            />
                          );
                        })
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
              ) : isHomeSpace ? (
                <AppNavigationBlockDropdownHome
                  locale={locale}
                  onTrackNavigation={handleTrackNavigation}
                  pathname={pathname}
                  space={space}
                />
              ) : isActSpace ? (
                <AppNavigationBlockDropdownAct
                  locale={locale}
                  onTrackNavigation={handleTrackNavigation}
                  pathname={pathname}
                  space={space}
                />
              ) : isNetworkSpace ? (
                <AppNavigationBlockDropdownNetwork
                  locale={locale}
                  onTrackNavigation={handleTrackNavigation}
                  pathname={pathname}
                  space={space}
                />
              ) : isLearnSpace ? (
                <AppNavigationBlockDropdownLearn
                  locale={locale}
                  onTrackNavigation={handleTrackNavigation}
                  pathname={pathname}
                  space={space}
                />
              ) : (
                <>
                <div className={NAVIGATION_DROPDOWN_PANEL_CONTENT_CLASS_NAME}>
                  <header className="flex items-center justify-center">
                    <h3 className={NAVIGATION_DROPDOWN_TITLE_CLASS_NAME}>
                      <span className="text-black">{getNavigationDropdownTitlePrefix(locale)} </span>
                      <span
                        className="inline-block"
                        style={getNavigationDropdownTitleGradientStyle(space.id)}
                      >
                        {getLocalizedText(space.label, locale, space.id)}
                      </span>
                    </h3>
                  </header>
                </div>

                  <ul className={NAVIGATION_DROPDOWN_PANEL_SCROLL_LIST_CLASS_NAME}>
                    {space.items.length > 0 ? (
                      space.items.map((item) => {
                        const isActiveItem = isActivePath(pathname, item.href);
                        const itemTone = getNavigationDropdownItemTone(space.id, item.routeId);
                        const itemBorderTokens = getNavigationDropdownCardBorderTokens(
                          space.id,
                          item.routeId,
                        );
                        return (
                          <li key={item.id}>
                            <Link
                              href={item.href}
                              prefetch={false}
                              aria-current={isActiveItem ? "page" : undefined}
                              onClick={() =>
                                handleTrackNavigation(
                                  item.href,
                                  getLocalizedText(item.label, locale, item.href),
                                  space.id,
                                )
                              }
                              className={cn(
                                "group/item flex items-center rounded-[0.9rem] px-[0.55rem] py-[0.35rem] transition focus-visible:outline-none",
                                NAVIGATION_DROPDOWN_ITEM_LINK_GAP_CLASS_NAME,
                                itemBorderTokens.focusRing,
                                itemBorderTokens.bodyClassName,
                              )}
                              style={isActiveItem ? itemBorderTokens.activeStyle : itemBorderTokens.inactiveStyle}
                            >
                              <span
                                className={cn(
                                  "min-w-0 flex-1 block whitespace-nowrap font-normal tracking-tight transition-colors duration-200",
                                  NAVIGATION_DROPDOWN_CARD_LABEL_CLASS_NAME,
                                  itemTone.labelClassName,
                                )}
                                style={itemTone.labelStyle}
                              >
                                {getLocalizedText(item.label, locale, item.href)}
                              </span>
                              <NavigationDropdownHelpText
                                text={getLocalizedText(item.description, locale, item.href)}
                              />
                            </Link>
                          </li>
                        );
                      })
                    ) : (
                      <li className="rounded-2xl border border-dashed border-black/16 px-3 py-3 text-[12px] text-black/80">
                        {locale === "fr"
                          ? "Aucune rubrique accessible pour ce bloc."
                          : "No accessible pages for this block."}
                      </li>
                    )}
                  </ul>
                </>
              )}

    </CmmDropdown>
  );
}
