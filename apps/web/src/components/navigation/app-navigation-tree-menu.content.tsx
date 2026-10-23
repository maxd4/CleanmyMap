"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { NavigationItem, NavigationSpace } from "@/lib/navigation";
import { getLocalizedText } from "@/lib/navigation";
import type { Locale } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";
import { NavigationItemText } from "./navigation-item-text";
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
import { getNavigationDropdownTitleGradientStyle } from "./navigation-dropdown-theme";

type NavigationTreeContentProps = {
  activeSpaceId: NavigationSpace["id"] | null;
  idBase: string;
  locale: Locale;
  onTrackNavigation: (href: string, label: string, spaceId: string | null) => void;
  pathname: string;
  spaces: NavigationSpace[];
  openSpaceId: NavigationSpace["id"] | null;
  setOpenSpaceId: (value: NavigationSpace["id"] | null | ((current: NavigationSpace["id"] | null) => NavigationSpace["id"] | null)) => void;
  onClose: () => void;
};

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavigationTreeContent({
  activeSpaceId,
  idBase,
  locale,
  onTrackNavigation,
  pathname,
  spaces,
  openSpaceId,
  setOpenSpaceId,
  onClose,
}: NavigationTreeContentProps) {
  const router = useRouter();
  return <div>
    <div className="flex items-center justify-end border-b border-black/10 px-3 py-2.5 sm:px-4">
      <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/12 bg-white/60 text-black/70 transition hover:border-black/22 hover:bg-white/75 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20" aria-label={locale === "fr" ? "Fermer le menu de navigation" : "Close navigation menu"}><Menu className="h-4 w-4" /></button>
    </div>
    <div className="max-h-[calc(100vh-11rem)] overflow-y-auto px-3 py-3 sm:px-4 lg:max-h-[min(72vh,36rem)]">
      <div className="space-y-2">
        {spaces.map((space) => {
          const isCurrentSpace = space.id === activeSpaceId;
          const isOpenSpace = openSpaceId === space.id || (!openSpaceId && isCurrentSpace);
          const panelId = `${idBase}-${space.id}-panel`;
          const buttonId = `${idBase}-${space.id}-trigger`;
          return <section key={space.id} className={cn(NAVIGATION_DROPDOWN_TREE_SECTION_CLASS_NAME, isOpenSpace ? NAVIGATION_DROPDOWN_TREE_SECTION_ACTIVE_CLASS_NAME : isCurrentSpace ? NAVIGATION_DROPDOWN_TREE_SECTION_CURRENT_CLASS_NAME : NAVIGATION_DROPDOWN_TREE_SECTION_INACTIVE_CLASS_NAME)}>
            <button id={buttonId} type="button" aria-expanded={isOpenSpace} aria-controls={panelId} aria-label={locale === "fr" ? `Ouvrir l'espace ${getLocalizedText(space.label, locale, space.id)}` : `Open space ${getLocalizedText(space.label, locale, space.id)}`} onClick={() => setOpenSpaceId((current) => current === space.id ? null : space.id)} className={cn("cmm-dropdown-trigger flex min-h-11 w-full items-center justify-between gap-2 rounded-[0.95rem] px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 [&::-webkit-details-marker]:hidden", isOpenSpace ? "bg-white/75 text-black" : "text-black hover:bg-white/60")}>
              <span className="flex min-w-0 items-center gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-lg text-black">{space.icon}</span><NavigationItemText label={getLocalizedText(space.label, locale, space.id)} labelClassName={NAVIGATION_DROPDOWN_TREE_SECTION_LABEL_CLASS_NAME} labelStyle={getNavigationDropdownTitleGradientStyle(space.id)} /></span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-black/60 transition-transform duration-150", isOpenSpace && "rotate-180")} aria-hidden="true" />
            </button>
            <AnimatePresence initial={false}>{isOpenSpace ? <motion.div key={panelId} data-motion-role="conditional" id={panelId} role="region" aria-labelledby={buttonId} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.16, ease: "easeOut" }} className={NAVIGATION_DROPDOWN_TREE_PANEL_INNER_CLASS_NAME}>
              <ul className={NAVIGATION_DROPDOWN_TREE_LIST_CLASS_NAME}>{space.items.map((item: NavigationItem) => {
                const isActiveItem = isActivePath(pathname, item.href);
                return <li key={item.id}><Link href={item.href} prefetch={false} aria-current={isActiveItem ? "page" : undefined} onClick={(event) => {
                  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  onTrackNavigation(item.href, getLocalizedText(item.label, locale, item.href), space.id);
                  router.push(item.href);
                  window.setTimeout(onClose, 0);
                }} className={cn(NAVIGATION_DROPDOWN_TREE_ITEM_CARD_CLASS_NAME, isActiveItem ? NAVIGATION_DROPDOWN_TREE_ITEM_ACTIVE_CLASS_NAME : NAVIGATION_DROPDOWN_TREE_ITEM_INACTIVE_CLASS_NAME)}><NavigationItemText label={getLocalizedText(item.label, locale, item.href)} labelClassName={NAVIGATION_DROPDOWN_TREE_ITEM_LABEL_CLASS_NAME} /></Link></li>;
              })}</ul>
            </motion.div> : null}</AnimatePresence>
          </section>;
        })}
      </div>
    </div>
  </div>;
}
