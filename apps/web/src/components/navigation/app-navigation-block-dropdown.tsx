"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import type { NavigationItem, NavigationSpace } from "@/lib/navigation";
import type { Locale } from "@/lib/ui/preferences";
import { useDropdownPlacement } from "@/components/ui/use-dropdown-placement";
import { cn } from "@/lib/utils";
import type { RibbonChrome } from "./app-navigation-ribbon-theme";

type AppNavigationBlockDropdownProps = {
  activeSpaceId: NavigationSpace["id"] | null;
  locale: Locale;
  onTrackNavigation: (href: string, label: string, spaceId: string | null) => void;
  pathname: string;
  ribbonChrome: RibbonChrome;
  space: NavigationSpace;
};

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigationBlockDropdown({
  activeSpaceId,
  locale,
  onTrackNavigation,
  pathname,
  ribbonChrome,
  space,
}: AppNavigationBlockDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placement = useDropdownPlacement({
    isOpen,
    triggerRef,
    minPanelWidth: 340,
  });

  const panelStyle = useMemo(
    () => ({
      backgroundImage: ribbonChrome.backgroundImage,
      backgroundColor: ribbonChrome.backgroundColor,
      borderColor: ribbonChrome.borderColor,
    }),
    [ribbonChrome.backgroundColor, ribbonChrome.backgroundImage, ribbonChrome.borderColor],
  );

  const isActiveSpace = space.id === activeSpaceId;
  const activeItem = space.items.find((item) => isActivePath(pathname, item.href)) ?? null;

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
    setIsOpen(true);
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
      onMouseEnter={openMenu}
      onMouseLeave={closeMenuSoon}
      onFocus={openMenu}
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
          "group inline-flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-[1.1rem] border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          isActiveSpace
            ? "border-white/18 bg-white/16 text-white shadow-[0_20px_40px_-26px_rgba(2,6,23,0.56)]"
            : "border-white/10 bg-white/[0.075] text-white/86 hover:border-white/18 hover:bg-white/[0.12] hover:text-white",
        )}
        title={space.label[locale]}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] border border-white/12 bg-white/10 text-[18px] leading-none shadow-[0_10px_20px_-14px_rgba(2,6,23,0.7)] transition-transform duration-150 group-hover:scale-105">
          {space.icon}
        </span>
        <span className="sr-only">{space.label[locale]}</span>
      </button>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-1/2 bottom-full z-40 mb-2 -translate-x-1/2 translate-y-1 scale-95 whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] opacity-0 shadow-[0_18px_36px_-24px_rgba(2,6,23,0.65)] transition-all duration-150",
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
              onMouseEnter={openMenu}
            />
            <motion.div
              key={`block-${space.id}-menu`}
              id={`block-${space.id}-menu`}
              role="region"
              aria-label={`${space.label[locale]} - ${locale === "fr" ? "rubriques" : "pages"}`}
              tabIndex={-1}
              initial={{ opacity: 0, y: placement.openUp ? 10 : -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: placement.openUp ? 10 : -10, scale: 0.98 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className={cn(
                "absolute z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[1.55rem] border shadow-[0_32px_74px_-34px_rgba(2,6,23,0.82)]",
                placement.openUp ? "bottom-[calc(100%+0.75rem)]" : "top-[calc(100%+0.75rem)]",
                placement.alignRight ? "right-0" : "left-0",
              )}
              onMouseEnter={openMenu}
              onMouseLeave={closeMenuSoon}
              onKeyDown={handleKeyDown}
              style={panelStyle}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                    {locale === "fr" ? "Bloc" : "Block"}
                  </p>
                  <h3 className="truncate text-[0.95rem] font-black text-white">
                    {space.label[locale]}
                  </h3>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white",
                  )}
                >
                  {space.items.length}
                </span>
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
                            "block rounded-2xl border px-3 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40",
                            isActiveItem
                              ? "border-white/18 bg-white/16 text-white"
                              : "border-white/10 bg-white/[0.06] text-white/86 hover:border-white/18 hover:bg-white/[0.11] hover:text-white",
                          )}
                        >
                          <span className="block text-[13px] font-semibold leading-snug">
                            {item.label[locale]}
                          </span>
                        </Link>
                      </li>
                    );
                  })
                ) : (
                  <li className="rounded-2xl border border-dashed border-white/16 px-3 py-3 text-[12px] text-white/72">
                    {locale === "fr"
                      ? "Aucune rubrique accessible pour ce bloc."
                      : "No accessible pages for this block."}
                  </li>
                )}
              </ul>

              {activeItem ? (
                <div className="border-t border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                  {locale === "fr" ? "Rubrique active" : "Active page"}:{" "}
                  <span className="text-white/85">{activeItem.label[locale]}</span>
                </div>
              ) : null}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
