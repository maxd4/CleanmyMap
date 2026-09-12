"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, List, Menu } from "lucide-react";
import Link from "next/link";
import type { NavigationSpace, NavigationItem } from "@/lib/navigation";
import { getLocalizedText } from "@/lib/navigation";
import type { Locale } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";
import { CmmDropdown } from "@/components/ui/cmm-dropdown";
import type { RibbonChrome } from "./app-navigation-ribbon-theme";
import {
  getNavigationDropdownTitleGradientStyle,
} from "./navigation-dropdown-theme";
import { getNavigationDropdownPanelStyle } from "./navigation-dropdown-shell-theme";
import {
  NAVIGATION_DROPDOWN_TREE_ITEM_ACTIVE_CLASS_NAME,
  NAVIGATION_DROPDOWN_TREE_ITEM_CARD_CLASS_NAME,
  NAVIGATION_DROPDOWN_TREE_ITEM_INACTIVE_CLASS_NAME,
  NAVIGATION_DROPDOWN_TREE_ITEM_LABEL_CLASS_NAME,
  NAVIGATION_DROPDOWN_TREE_LIST_CLASS_NAME,
  NAVIGATION_DROPDOWN_TREE_PANEL_INNER_CLASS_NAME,
  NAVIGATION_DROPDOWN_TREE_SECTION_ACTIVE_CLASS_NAME,
  NAVIGATION_DROPDOWN_TREE_SECTION_CLASS_NAME,
  NAVIGATION_DROPDOWN_TREE_SECTION_CURRENT_CLASS_NAME,
  NAVIGATION_DROPDOWN_TREE_SECTION_LABEL_CLASS_NAME,
  NAVIGATION_DROPDOWN_TREE_SECTION_INACTIVE_CLASS_NAME,
} from "./navigation-dropdown-size-theme";

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
  const panelStyle = getNavigationDropdownPanelStyle(activeSpaceId ?? spaces[0]?.id ?? null);

  return (
    <CmmDropdown
      id={`${idBase}-panel`}
      ariaLabel={locale === "fr" ? "Sommaire des sections et rubriques" : "Summary of sections and pages"}
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          setOpenSpaceId(activeSpaceId ?? spaces[0]?.id ?? null);
        }
      }}
      panelRole="region"
      triggerHasPopup="dialog"
      panelClassName="max-h-[calc(100vh-7rem)] w-[min(34rem,calc(100vw-1rem))] overflow-hidden rounded-[1.75rem] border text-black shadow-[0_28px_70px_-30px_rgba(15,23,42,0.24)]"
      panelStyle={panelStyle}
      renderTrigger={(triggerProps) => (
        <button
          {...triggerProps}
          aria-label={locale === "fr" ? "Sommaire" : "Summary"}
        className={cn(
          "inline-flex h-11 min-h-11 w-11 min-w-11 items-center justify-center gap-2 rounded-full border px-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:h-auto sm:min-h-11 sm:w-auto sm:min-w-[9.5rem] sm:px-4",
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
        <span className="hidden cmm-text-caption font-bold uppercase tracking-[0.16em] sm:inline">
          {locale === "fr" ? "Sommaire" : "Summary"}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-180")}
          aria-hidden="true"
        />
        </button>
      )}
    >
      <div>
              <div className="flex items-center justify-end border-b border-black/10 px-3 py-2.5 sm:px-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/12 bg-white/60 text-black/70 transition hover:border-black/22 hover:bg-white/75 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
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
                          NAVIGATION_DROPDOWN_TREE_SECTION_CLASS_NAME,
                          isOpenSpace
                            ? NAVIGATION_DROPDOWN_TREE_SECTION_ACTIVE_CLASS_NAME
                            : isCurrentSpace
                              ? NAVIGATION_DROPDOWN_TREE_SECTION_CURRENT_CLASS_NAME
                              : NAVIGATION_DROPDOWN_TREE_SECTION_INACTIVE_CLASS_NAME,
                        )}
                      >
                        <button
                          id={buttonId}
                          type="button"
                          aria-expanded={isOpenSpace}
                          aria-controls={panelId}
                          aria-label={locale === "fr" ? `Ouvrir l'espace ${getLocalizedText(space.label, locale, space.id)}` : `Open space ${getLocalizedText(space.label, locale, space.id)}`}
                          onClick={() =>
                            setOpenSpaceId((current) => (current === space.id ? null : space.id))
                          }
                          className={cn(
                            "cmm-dropdown-trigger flex min-h-11 w-full items-center justify-between gap-2 rounded-[0.95rem] px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 [&::-webkit-details-marker]:hidden",
                            isOpenSpace
                              ? "bg-white/75 text-black"
                              : "text-black hover:bg-white/60",
                          )}
                          >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-lg text-black">
                              {space.icon}
                            </span>
                            <span className="min-w-0">
                              <span
                                className={NAVIGATION_DROPDOWN_TREE_SECTION_LABEL_CLASS_NAME}
                                style={getNavigationDropdownTitleGradientStyle(space.id)}
                              >
                                {getLocalizedText(space.label, locale, space.id)}
                              </span>
                            </span>
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 text-black/60 transition-transform duration-150",
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
                              className={NAVIGATION_DROPDOWN_TREE_PANEL_INNER_CLASS_NAME}
                            >
                              <ul className={NAVIGATION_DROPDOWN_TREE_LIST_CLASS_NAME}>
                                {space.items.map((item: NavigationItem) => {
                                  const isActiveItem = isActivePath(pathname, item.href);
                                  return (
                                    <li key={item.id}>
                                      <Link
                                        href={item.href}
                                        prefetch={false}
                                        aria-current={isActiveItem ? "page" : undefined}
                                        onClick={() => {
                                          onTrackNavigation(item.href, getLocalizedText(item.label, locale, item.href), space.id);
                                          setIsOpen(false);
                                        }}
                                        className={cn(
                                          NAVIGATION_DROPDOWN_TREE_ITEM_CARD_CLASS_NAME,
                                          isActiveItem
                                            ? NAVIGATION_DROPDOWN_TREE_ITEM_ACTIVE_CLASS_NAME
                                            : NAVIGATION_DROPDOWN_TREE_ITEM_INACTIVE_CLASS_NAME,
                                        )}
                                      >
                                        <span className={NAVIGATION_DROPDOWN_TREE_ITEM_LABEL_CLASS_NAME}>
                                          {getLocalizedText(item.label, locale, item.href)}
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
      </div>
    </CmmDropdown>
  );
}
