"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import {
  BarChart3,
  ChevronRight,
  Dumbbell,
  Info,
  MapPinned,
  Medal,
} from "lucide-react";
import type { NavigationItem, NavigationSpace } from "@/lib/navigation";
import type { Locale } from "@/lib/ui/preferences";
import { useDropdownPlacement } from "@/components/ui/use-dropdown-placement";
import { cn } from "@/lib/utils";
import type { RibbonChrome } from "./app-navigation-ribbon-theme";
import {
  getNavigationDropdownPanelStyle,
  getNavigationDropdownTitleLabel,
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
    case "sandbox":
      return Dumbbell;
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
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placement = useDropdownPlacement({
    isOpen,
    triggerRef,
    minPanelWidth: 340,
  });

  const panelStyle = getNavigationDropdownPanelStyle(space.id);
  const isActiveSpace = space.id === activeSpaceId;
  const isVisualizeSpace = space.id === "visualize";
  const visualizePanelStyle = isVisualizeSpace
    ? {
        ...panelStyle,
        backgroundColor: "#ffffff",
        borderColor: "transparent",
        borderStyle: "solid",
        borderWidth: "1px",
        borderImage:
          "linear-gradient(90deg, rgba(34,211,238,0.95) 0%, rgba(255,255,255,0.55) 38%, rgba(239,68,68,0.95) 100%) 1",
      }
    : panelStyle;

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

  function handleTrackNavigation(item: NavigationItem) {
    onTrackNavigation(item.href, item.label[locale], space.id);
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
        title={space.label[locale]}
      >
        <span className="select-none" aria-hidden="true">
          {space.icon}
        </span>
        <span className="sr-only">{space.label[locale]}</span>
      </button>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-1/2 bottom-full z-40 mb-2 -translate-x-1/2 translate-y-1 scale-95 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] opacity-0 shadow-[0_18px_36px_-24px_rgba(2,6,23,0.18)] transition-all duration-150 text-black",
          "group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100",
        )}
        style={panelStyle}
      >
        {space.label[locale]}
      </span>

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
              aria-label={`${space.label[locale]} - ${locale === "fr" ? "rubriques" : "pages"}`}
              tabIndex={-1}
              initial={{ opacity: 0, y: placement.openUp ? 10 : -10, scale: 0.98, x: "-50%" }}
              animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
              exit={{ opacity: 0, y: placement.openUp ? 10 : -10, scale: 0.98, x: "-50%" }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className={cn(
                  isVisualizeSpace
                  ? "absolute left-1/2 z-50 mt-2 w-[min(20.75rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.5rem] border text-[#0f2567] shadow-[0_24px_52px_-26px_rgba(15,23,42,0.16)]"
                  : "absolute left-1/2 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[1.55rem] border text-black shadow-[0_32px_74px_-34px_rgba(15,23,42,0.24)]",
                placement.openUp ? "bottom-[calc(100%+0.75rem)]" : "top-[calc(100%+0.75rem)]",
              )}
              onMouseEnter={canHover ? openMenu : undefined}
              onMouseLeave={canHover ? closeMenuSoon : undefined}
              onKeyDown={handleKeyDown}
              style={visualizePanelStyle}
            >
              {isVisualizeSpace ? (
                <div className="px-3 pb-2.5 pt-2.5 sm:px-3.5 sm:pt-3">
                  <header className="flex items-center justify-center">
                    <h3 className="w-full whitespace-nowrap text-center text-[0.9rem] font-black leading-tight tracking-[-0.03em] text-slate-950 sm:text-[0.98rem]">
                      {getNavigationDropdownTitleLabel(locale, space.label[locale])}
                    </h3>
                  </header>

                  <nav className="mt-2" aria-label={space.label[locale]}>
                    <ul className="space-y-1">
                      {space.items.length > 0 ? (
                        space.items.map((item) => {
                          const isActiveItem = isActivePath(pathname, item.href);
                          const Icon = getVisualizeItemIcon(item.routeId);
                          return (
                            <li key={item.id}>
                              <button
                                type="button"
                                title={item.description[locale]}
                                aria-pressed={isActiveItem}
                                onClick={() => {
                                  handleTrackNavigation(item);
                                  router.push(item.href);
                                }}
                                className="group/item block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
                              >
                                <div
                                  className={cn(
                                    "rounded-[0.9rem] p-[1.5px] transition-all duration-200",
                                    isActiveItem
                                      ? "bg-[linear-gradient(90deg,rgba(34,211,238,0.96)_0%,rgba(255,255,255,0.98)_46%,rgba(239,68,68,0.92)_100%)] shadow-[0_7px_16px_rgba(15,23,42,0.05)]"
                                      : "bg-[linear-gradient(90deg,rgba(34,211,238,0.92)_0%,rgba(255,255,255,0.92)_46%,rgba(239,68,68,0.86)_100%)] shadow-[0_7px_16px_rgba(15,23,42,0.05)] group-hover/item:scale-[1.01] group-hover/item:shadow-[0_10px_24px_rgba(15,23,42,0.09)]",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "flex min-h-[1.95rem] items-center gap-1 rounded-[calc(0.9rem-1.5px)] border px-[0.55rem] py-[0.35rem] text-left transition-all duration-200",
                                      isActiveItem
                                        ? "border-cyan-300/80 bg-white/94 text-slate-950"
                                        : "border-cyan-200/70 bg-white/82 group-hover/item:border-red-500 group-hover/item:ring-2 group-hover/item:ring-red-300/25 group-hover/item:bg-white",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "flex h-[1.625rem] w-[1.625rem] shrink-0 items-center justify-center rounded-full border bg-gradient-to-br from-cyan-100 via-white to-rose-100 shadow-[0_0_0_2px_rgba(6,182,212,0.10)] transition-transform duration-200 group-hover/item:scale-[1.03] sm:h-7 sm:w-7",
                                        isActiveItem
                                          ? "border-cyan-300 text-cyan-700"
                                          : "border-cyan-200 text-cyan-700",
                                      )}
                                    >
                                      <Icon className="h-[0.68rem] w-[0.68rem] sm:h-3 sm:w-3" strokeWidth={2.25} aria-hidden="true" />
                                    </span>

                                    <span className="min-w-0 flex-1">
                                      <span className="block whitespace-nowrap text-[0.7rem] font-medium tracking-tight text-slate-950 transition-all duration-200 origin-left group-hover/item:scale-[1.05] group-hover/item:font-bold sm:text-[0.76rem]">
                                        {item.label[locale]}
                                      </span>
                                    </span>

                                    <ChevronRight
                                      className={cn(
                                        "h-[0.68rem] w-[0.68rem] shrink-0 transition-transform duration-200 group-hover/item:translate-x-1.25 group-hover/item:scale-110 sm:h-3 sm:w-3",
                                        isActiveItem ? "text-red-500" : "text-cyan-700",
                                      )}
                                      strokeWidth={3}
                                      aria-hidden="true"
                                    />
                                  </div>
                                </div>
                              </button>
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
                  </nav>
                </div>
              ) : (
                <>
                  <div className="border-b border-black/10 px-4 py-3.5">
                    <h3 className="truncate text-[0.95rem] font-black tracking-[0.02em] text-black">
                      {getNavigationDropdownTitleLabel(locale, space.label[locale])}
                    </h3>
                  </div>

                  <ul className="max-h-[min(22rem,calc(100vh-10rem))] space-y-1 overflow-y-auto px-3 py-3">
                    {space.items.length > 0 ? (
                      space.items.map((item) => {
                        const isActiveItem = isActivePath(pathname, item.href);
                        return (
                          <li key={item.id}>
                            <Link
                              href={item.href}
                              aria-current={isActiveItem ? "page" : undefined}
                              title={item.description[locale]}
                              onClick={() => handleTrackNavigation(item)}
                              className={cn(
                                "block rounded-2xl border px-3 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20",
                                isActiveItem
                                  ? "border-black/18 bg-white/70 text-black"
                                  : "border-black/10 bg-white/45 text-black/80 hover:border-black/18 hover:bg-white/65 hover:text-black",
                              )}
                            >
                              <span className="block text-[13px] font-semibold leading-snug text-black">
                                {item.label[locale]}
                              </span>
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
