"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, List, Menu } from "lucide-react";
import Link from "next/link";
import type { NavigationSpace, NavigationItem } from "@/lib/navigation";
import type { Locale } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";
import { useDropdownPlacement } from "@/components/ui/use-dropdown-placement";
import type { RibbonChrome } from "./app-navigation-ribbon-theme";

type AppNavigationTreeMenuProps = {
  activeSpaceId: NavigationSpace["id"] | null;
  idBase: string;
  locale: Locale;
  onTrackNavigation: (href: string, label: string, spaceId: string | null) => void;
  pathname: string;
  ribbonChrome?: RibbonChrome; // conservé pour compatibilité, non utilisé
  spaces: NavigationSpace[];
};

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigationTreeMenu({
  activeSpaceId,
  idBase,
  locale,
  onTrackNavigation,
  pathname,
  spaces,
}: AppNavigationTreeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSpaceId, setOpenSpaceId] = useState<NavigationSpace["id"] | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placement = useDropdownPlacement({
    isOpen,
    triggerRef,
    minPanelWidth: 420,
  });

  // Fond vert foncé fixe — lisible, cohérent avec l'identité écologique
  const panelStyle = {
    backgroundImage: "linear-gradient(135deg, rgba(5,46,22,0.98) 0%, rgba(6,78,37,0.97) 54%, rgba(4,55,28,0.97) 100%)",
    backgroundColor: "rgba(5,46,22,0.98)",
    borderColor: "rgba(52,211,153,0.22)",
  } as const;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    panelRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const closeOnPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        !triggerRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnPointerDown);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnPointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const openMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(true);
    setOpenSpaceId(activeSpaceId ?? spaces[0]?.id ?? null);
  };

  const closeMenuAfterHover = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, 160);
  };

  const toggleMenu = () => {
    setIsOpen((current) => {
      const next = !current;
      if (next) {
        setOpenSpaceId(activeSpaceId ?? spaces[0]?.id ?? null);
      }
      return next;
    });
  };

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={openMenu}
      onMouseLeave={closeMenuAfterHover}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={`${idBase}-panel`}
        aria-haspopup="dialog"
        onClick={toggleMenu}
        className={cn(
          "inline-flex min-h-11 min-w-[9.5rem] items-center justify-center gap-2 rounded-full border px-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          "border-cyan-200/24 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-white shadow-[0_18px_36px_-20px_rgba(20,184,166,0.5)] hover:border-cyan-100/40 hover:from-cyan-400 hover:via-teal-400 hover:to-emerald-400",
          isOpen && "scale-[1.01]",
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
            "border-white/16 bg-white/14",
          )}
          aria-hidden="true"
        >
          <List className="h-4 w-4 shrink-0" aria-hidden="true" />
        </span>
        <span className="cmm-text-caption font-bold uppercase tracking-[0.16em]">
          {locale === "fr" ? "Sommaire" : "Summary"}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <>
            <motion.div
              key="app-navigation-tree-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-950/42"
            />
            <motion.div
              key="app-navigation-tree-panel"
              ref={panelRef}
              id={`${idBase}-panel`}
              role="dialog"
              aria-modal="false"
                aria-label={
                  locale === "fr"
                    ? "Sommaire des sections et rubriques"
                    : "Summary of sections and pages"
                }
              tabIndex={-1}
              initial={{ opacity: 0, y: placement.openUp ? 10 : -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: placement.openUp ? 10 : -10, scale: 0.98 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className={cn(
                "fixed inset-x-4 z-50 max-h-[calc(100vh-7rem)] overflow-hidden rounded-[1.75rem] border shadow-[0_28px_70px_-30px_rgba(2,6,23,0.75)] lg:absolute lg:inset-x-auto lg:max-h-[min(72vh,42rem)] lg:w-[min(34rem,calc(100vw-5rem))]",
                "top-[calc(var(--app-ribbon-top-offset,0.5rem)+4.75rem)] lg:top-full",
                placement.openUp ? "lg:bottom-full lg:top-auto lg:mb-3" : "lg:mt-3",
                placement.alignRight ? "lg:right-0" : "lg:left-0",
              )}
              onMouseEnter={openMenu}
              onMouseLeave={closeMenuAfterHover}
              style={panelStyle}
            >
              <div className="flex items-center justify-end border-b border-white/10 px-3 py-2.5 sm:px-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/10 text-white/74 transition hover:border-white/22 hover:bg-white/16 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
                  aria-label={locale === "fr" ? "Fermer le menu de navigation" : "Close navigation menu"}
                >
                  <Menu className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[calc(100vh-11rem)] overflow-y-auto px-3 py-3 sm:px-4 lg:max-h-[min(72vh,36rem)]">
                <div className="space-y-2">
                  {spaces.map((space) => {
                    const isCurrentSpace = space.id === activeSpaceId;
                    const isOpenSpace = openSpaceId === space.id || (!openSpaceId && isCurrentSpace);
                    const panelId = `${idBase}-${space.id}-panel`;
                    const buttonId = `${idBase}-${space.id}-trigger`;

                    return (
                      <section
                        key={space.id}
                        className={cn(
                          "rounded-[1.2rem] border bg-white/8 p-1.5",
                          isOpenSpace
                            ? "border-blue-300/30 bg-white/12"
                            : isCurrentSpace
                              ? "border-emerald-300/24 bg-emerald-400/8"
                              : "border-white/12",
                        )}
                      >
                        <button
                          id={buttonId}
                          type="button"
                          aria-expanded={isOpenSpace}
                          aria-controls={panelId}
                          aria-label={locale === "fr" ? `Ouvrir l'espace ${space.label.fr}` : `Open space ${space.label.en}`}
                          onClick={() =>
                            setOpenSpaceId((current) => (current === space.id ? null : space.id))
                          }
                          className={cn(
                            "cmm-dropdown-trigger flex min-h-11 w-full items-center justify-between gap-2 rounded-[0.95rem] px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 [&::-webkit-details-marker]:hidden",
                            isOpenSpace
                              ? "bg-white/14 text-white"
                              : "text-white/86 hover:bg-white/10 hover:text-white",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg">
                              {space.icon}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate cmm-text-small font-bold uppercase tracking-[0.12em]">
                                {space.label[locale]}
                              </span>
                            </span>
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 text-white/70 transition-transform duration-150",
                              isOpenSpace && "rotate-180",
                            )}
                            aria-hidden="true"
                          />
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpenSpace ? (
                            <motion.div
                              key={panelId}
                              id={panelId}
                              role="region"
                              aria-labelledby={buttonId}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.16, ease: "easeOut" }}
                              className="overflow-hidden"
                            >
                              <ul className="mt-1.5 space-y-1 px-1 pb-1">
                                {space.items.map((item: NavigationItem) => {
                                  const isActiveItem = isActivePath(pathname, item.href);
                                  return (
                                    <li key={item.id}>
                                      <Link
                                        href={item.href}
                                        aria-current={isActiveItem ? "page" : undefined}
                                        onClick={() => {
                                          onTrackNavigation(item.href, item.label[locale], space.id);
                                          setIsOpen(false);
                                        }}
                                        className={cn(
                                          "block rounded-xl border px-3 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40",
                                          isActiveItem
                                            ? "border-blue-300/35 bg-blue-400/14 text-white"
                                            : "border-transparent bg-transparent text-white/82 hover:border-white/12 hover:bg-white/10 hover:text-white",
                                        )}
                                      >
                                        <span className="block cmm-text-small font-semibold">
                                          {item.label[locale]}
                                        </span>
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </section>
                    );
                  })}
                </div>
              </div>
            </motion.div>
            <div
              className={cn(
                "absolute z-50 hidden h-3 w-full lg:block",
                placement.openUp ? "bottom-full" : "top-full",
              )}
              onMouseEnter={openMenu}
              aria-hidden="true"
            />
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
