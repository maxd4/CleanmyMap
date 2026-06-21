"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import {
  BarChart3,
  ChevronRight,
  Info,
  MapPinned,
  Medal,
} from "lucide-react";
import type { NavigationItem, NavigationSpace } from "@/lib/navigation";
import { getLocalizedText } from "@/lib/navigation";
import type { Locale } from "@/lib/ui/preferences";
import { useDropdownPlacement } from "@/components/ui/use-dropdown-placement";
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
  NAVIGATION_DROPDOWN_PANEL_MIN_WIDTH,
  NAVIGATION_DROPDOWN_TITLE_CLASS_NAME,
  NAVIGATION_DROPDOWN_CARD_LABEL_CLASS_NAME,
  NAVIGATION_DROPDOWN_ITEM_LINK_GAP_CLASS_NAME,
} from "./navigation-dropdown-size-theme";
import {
  getNavigationDropdownTitleGradientStyle,
  getNavigationDropdownTitlePrefix,
} from "./navigation-dropdown-theme";

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
  const [canHover, setCanHover] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placement = useDropdownPlacement({
    isOpen,
    triggerRef,
    minPanelWidth: NAVIGATION_DROPDOWN_PANEL_MIN_WIDTH,
  });

  const shellTokens = getNavigationDropdownShellTokens(space.id);
  const cardGeometry = getNavigationDropdownCardGeometry(space.id);
  const isActiveSpace = space.id === activeSpaceId;
  const isHomeSpace = space.id === "home";
  const isActSpace = space.id === "act";
  const isVisualizeSpace = space.id === "visualize";
  const isNetworkSpace = space.id === "network";
  const isLearnSpace = space.id === "learn";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !wrapperRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

    const updateCanHover = () => {
      setCanHover(mediaQuery.matches);
    };

    updateCanHover();
    mediaQuery.addEventListener("change", updateCanHover);

    return () => {
      mediaQuery.removeEventListener("change", updateCanHover);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  function openMenu() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(true);
  }

  function closeMenuSoon() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, 140);
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const nextFocus = event.relatedTarget as Node | null;
    if (nextFocus && wrapperRef.current?.contains(nextFocus)) {
      return;
    }
    closeMenuSoon();
  }

  function handleButtonClick() {
    if (canHover) {
      openMenu();
      return;
    }

    setIsOpen((current) => !current);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  }

  function handleTrackNavigation(href: string, label: string, spaceId: string | null) {
    onTrackNavigation(href, label, spaceId);
    setIsOpen(false);
  }

  return (
    <div
      ref={wrapperRef}
      className="group relative shrink-0"
      onMouseEnter={canHover ? openMenu : undefined}
      onMouseLeave={canHover ? closeMenuSoon : undefined}
      onFocus={canHover ? openMenu : undefined}
      onBlur={handleBlur}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={`block-${space.id}-menu`}
        aria-haspopup="menu"
        onClick={handleButtonClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.8rem] border border-transparent bg-transparent text-[20px] leading-none transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          isActiveSpace
            ? "bg-white/[0.08] text-white"
            : "text-white/86 hover:bg-white/[0.07] hover:text-white",
        )}
      >
        <span className="select-none" aria-hidden="true">
          {space.icon}
        </span>
        <span className="sr-only">{getLocalizedText(space.label, locale, space.id)}</span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <>
            <motion.div
              key={`block-${space.id}-gap`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "absolute z-40 hidden h-3 w-full lg:block",
                placement.openUp ? "bottom-full" : "top-full",
              )}
              aria-hidden="true"
              onMouseEnter={canHover ? openMenu : undefined}
            />
            <motion.div
              key={`block-${space.id}-menu`}
              id={`block-${space.id}-menu`}
              role="region"
              aria-label={`${getLocalizedText(space.label, locale, space.id)} - ${locale === "fr" ? "rubriques" : "pages"}`}
              tabIndex={-1}
              initial={{ opacity: 0, y: placement.openUp ? 10 : -10, scale: 0.98, x: "-50%" }}
              animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
              exit={{ opacity: 0, y: placement.openUp ? 10 : -10, scale: 0.98, x: "-50%" }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className={cn(
                shellTokens.className,
                placement.openUp ? "bottom-[calc(100%+0.75rem)]" : "top-[calc(100%+0.75rem)]",
              )}
              onMouseEnter={canHover ? openMenu : undefined}
              onMouseLeave={canHover ? closeMenuSoon : undefined}
              onKeyDown={handleKeyDown}
              style={shellTokens.style}
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
                  onTrackNavigation={onTrackNavigation}
                  pathname={pathname}
                  space={space}
                />
              ) : isActSpace ? (
                <AppNavigationBlockDropdownAct
                  locale={locale}
                  onTrackNavigation={onTrackNavigation}
                  pathname={pathname}
                  space={space}
                />
              ) : isNetworkSpace ? (
                <AppNavigationBlockDropdownNetwork
                  locale={locale}
                  onTrackNavigation={onTrackNavigation}
                  pathname={pathname}
                  space={space}
                />
              ) : isLearnSpace ? (
                <AppNavigationBlockDropdownLearn
                  locale={locale}
                  onTrackNavigation={onTrackNavigation}
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

            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
