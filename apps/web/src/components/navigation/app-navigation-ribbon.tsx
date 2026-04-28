"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Compass,
  House,
  MapPinned,
  MessageSquare,
  Route,
  Settings2,
  Target,
  Users,
} from "lucide-react";
import { Show, SignInButton, SignUpButton, UserButton } from"@clerk/nextjs";
import Link from"next/link";
import { usePathname } from"next/navigation";
import type { UserIdentity } from"@/lib/authz";
import { trackNavigationClick } from"@/lib/analytics/navigation-client";
import { NotificationBell } from"@/components/navigation/notification-bell";
import {
 getActiveSpaceForPath,
 getNavigationSpacesForProfile,
 getPilotFallbackItems,
} from"@/lib/navigation";
import { SitePreferencesControls } from"@/components/ui/site-preferences-controls";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import type { AppProfile } from"@/lib/profiles";
import { AccountIdentityChip } from"@/components/account/account-identity-chip";
import { getRibbonNavigationGroups } from"./app-navigation-ribbon.utils";
import { cn } from"@/lib/utils";

const SPACE_ICON_MAP = {
 home: House,
 act: Route,
 visualize: MapPinned,
 impact: BarChart3,
 network: Users,
 connect: MessageSquare,
 learn: BookOpen,
 pilot: Target,
} as const;

type AppNavigationRibbonProps = {
 currentProfile: AppProfile;
 profileLabel: string;
 identity: UserIdentity | null;
};

function contextLabel(
 profileLabel: string,
 activeSpaceLabel?: string,
 activeItemLabel?: string,
): string {
 const segments = [profileLabel, activeSpaceLabel, activeItemLabel].filter(
 (segment): segment is string => Boolean(segment && segment.trim().length > 0),
 );
 return segments.join(" /");
}

function getItemTooltip(
 item: { label: Record<string, string>; description: Record<string, string> },
 locale: string,
) {
 return `${item.label[locale]} — utilité & impact : ${item.description[locale]}`;
}

function getSpaceTooltip(
 space: { label: Record<string, string>; items: { label: Record<string, string> }[] },
 locale: string,
) {
 const itemCount = space.items.length;
 return `${space.label[locale]} — ${itemCount} rubrique${itemCount > 1 ?"s" :""} dans ce bloc.`;
}

function isActivePath(pathname: string, href: string): boolean {
 return pathname === href || pathname.startsWith(`${href}/`);
}

function getSpaceIcon(spaceId: keyof typeof SPACE_ICON_MAP) {
 return SPACE_ICON_MAP[spaceId];
}

function getSpaceToneClasses(spaceId: keyof typeof SPACE_ICON_MAP): {
 active: string;
 inactive: string;
 glow: string;
} {
 const toneBySpace = {
 home: {
 active: "border-slate-400/30 bg-slate-900/60 text-slate-50 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)]",
 inactive: "border-slate-800/40 bg-slate-900/20 text-slate-500 hover:border-slate-600/50 hover:bg-slate-900/40 hover:text-slate-200",
 glow: "bg-slate-500/20",
 },
 act: {
 active: "border-amber-500/30 bg-amber-950/40 text-amber-50 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.3)]",
 inactive: "border-amber-900/30 bg-amber-950/10 text-amber-500/50 hover:border-amber-700/50 hover:bg-amber-950/30 hover:text-amber-200",
 glow: "bg-amber-500/30",
 },
 visualize: {
 active: "border-sky-500/30 bg-sky-950/40 text-sky-50 shadow-[0_10px_30px_-10px_rgba(14,165,233,0.3)]",
 inactive: "border-sky-900/30 bg-sky-950/10 text-sky-500/50 hover:border-sky-700/50 hover:bg-sky-950/30 hover:text-sky-200",
 glow: "bg-sky-500/30",
 },
 impact: {
 active: "border-emerald-500/30 bg-emerald-950/40 text-emerald-50 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)]",
 inactive: "border-emerald-900/30 bg-emerald-950/10 text-emerald-500/50 hover:border-emerald-700/50 hover:bg-emerald-950/30 hover:text-emerald-200",
 glow: "bg-emerald-500/30",
 },
 network: {
 active: "border-cyan-500/30 bg-cyan-950/40 text-cyan-50 shadow-[0_10px_30px_-10px_rgba(6,182,212,0.3)]",
 inactive: "border-cyan-900/30 bg-cyan-950/10 text-cyan-500/50 hover:border-cyan-700/50 hover:bg-cyan-950/30 hover:text-cyan-200",
 glow: "bg-cyan-500/30",
 },
 connect: {
 active: "border-pink-500/30 bg-pink-950/40 text-pink-50 shadow-[0_10px_30px_-10px_rgba(236,72,153,0.3)]",
 inactive: "border-pink-900/30 bg-pink-950/10 text-pink-500/50 hover:border-pink-700/50 hover:bg-pink-950/30 hover:text-pink-200",
 glow: "bg-pink-500/30",
 },
 learn: {
 active: "border-rose-500/30 bg-rose-950/40 text-rose-50 shadow-[0_10px_30px_-10px_rgba(244,63,94,0.3)]",
 inactive: "border-rose-900/30 bg-rose-950/10 text-rose-500/50 hover:border-rose-700/50 hover:bg-rose-950/30 hover:text-rose-200",
 glow: "bg-rose-500/30",
 },
 pilot: {
 active: "border-indigo-500/30 bg-indigo-950/40 text-indigo-50 shadow-[0_10px_30px_-10px_rgba(99,102,241,0.3)]",
 inactive: "border-indigo-900/30 bg-indigo-950/10 text-indigo-500/50 hover:border-indigo-700/50 hover:bg-indigo-950/30 hover:text-indigo-200",
 glow: "bg-indigo-500/30",
 },
 } as const;
 return toneBySpace[spaceId];
}

export function AppNavigationRibbon({
 currentProfile,
 profileLabel,
 identity,
}: AppNavigationRibbonProps) {
 const pathname = usePathname();
 const { locale, displayMode } = useSitePreferences();
 const preferencesMenuRef = useRef<HTMLDetailsElement | null>(null);
 const [isScrolled, setIsScrolled] = useState(false);
 const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

 const [lastPathname, setLastPathname] = useState(pathname);
 if (pathname !== lastPathname) {
 setLastPathname(pathname);
 setIsPreferencesOpen(false);
 }

 const spaces = useMemo(
 () => getNavigationSpacesForProfile(currentProfile, displayMode, locale),
 [currentProfile, displayMode, locale],
 );
 const activeSpaceId = getActiveSpaceForPath(currentProfile, pathname, displayMode);
 const { activeSpace } = useMemo(
 () => getRibbonNavigationGroups(spaces, activeSpaceId),
 [activeSpaceId, spaces],
 );

 const activeSpaceItems = useMemo(
 () =>
 activeSpace?.id ==="pilot" && activeSpace.items.length === 0
 ? getPilotFallbackItems(locale)
 : activeSpace?.items ?? [],
 [activeSpace, locale],
 );
 const activeItem = useMemo(
 () =>
 activeSpaceItems.find(
 (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
 ),
 [activeSpaceItems, pathname],
 );
 const contextText = contextLabel(
 profileLabel,
 activeSpace ? activeSpace.label[locale] : undefined,
 activeItem ? activeItem.label[locale] : undefined,
 );

 function onTrackNavigation(href: string, label: string, spaceId: string | null) {
 trackNavigationClick({
 profile: currentProfile,
 spaceId,
 href,
 label,
 });
 }

 useEffect(() => {
 const syncScrollState = () => {
 setIsScrolled(window.scrollY > 4);
 };

 syncScrollState();
 window.addEventListener("scroll", syncScrollState, { passive: true });
 return () => {
 window.removeEventListener("scroll", syncScrollState);
 };
 }, []);

 useEffect(() => {
 const closeMenusOnOutsideClick = (event: PointerEvent) => {
 const target = event.target as Node | null;
 if (
 preferencesMenuRef.current &&
 target &&
 !preferencesMenuRef.current.contains(target)
 ) {
 setIsPreferencesOpen(false);
 }
 };

 const closeMenusOnEscape = (event: KeyboardEvent) => {
 if (event.key ==="Escape") {
 setIsPreferencesOpen(false);
 }
 };

 document.addEventListener("pointerdown", closeMenusOnOutsideClick);
 document.addEventListener("keydown", closeMenusOnEscape);
 return () => {
 document.removeEventListener("pointerdown", closeMenusOnOutsideClick);
 document.removeEventListener("keydown", closeMenusOnEscape);
 };
 }, []);

 return (
    <div className="relative z-30 w-full px-4 pt-4 sm:px-6 xl:px-10">
      <nav
        aria-label={locale === "fr" ? "Barre de navigation principale" : "Main navigation bar"}
        className={cn(
          "overflow-hidden rounded-[2.5rem] border border-slate-800/40 bg-slate-950/60 backdrop-blur-xl transition-all duration-500",
          isScrolled
            ? "shadow-[0_48px_96px_-24px_rgba(0,0,0,0.9)]"
            : "shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]"
        )}
      >
        <div className="mx-auto w-full px-4 py-2 sm:px-6">
          <div className="flex flex-col gap-4">
            {/* RANGÉE SUPÉRIEURE : LOGO + ESPACES + ACTIONS */}
            <div className="flex items-center justify-between gap-4">
              {/* LOGO (Glace) */}
              <div className="flex shrink-0 items-center">
                <Link
                  href="/"
                  className="group relative flex items-center justify-center rounded-full border border-slate-700/30 bg-slate-900/40 px-5 py-2.5 cmm-text-caption font-black uppercase tracking-[0.25em] text-slate-100 transition-all hover:border-emerald-500/50 hover:bg-slate-800/60 active:scale-95 shadow-lg"
                  onClick={() => onTrackNavigation("/", "CleanMyMap", null)}
                >
                  <span className="relative z-10">CleanMyMap</span>
                  <div className="absolute inset-0 -z-0 rounded-full bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </div>

              {/* SÉLECTEUR D'ESPACES (DASHBOARD PILLS) */}
              <div className="hidden flex-1 items-center justify-center lg:flex">
                <div className="relative flex items-center gap-1.5 rounded-full border border-slate-800/60 bg-slate-900/60 p-1.5 shadow-inner">
                  {spaces.map((space) => {
                    const firstHref = space.items[0]?.href ?? "/dashboard";
                    const isSpaceActive = space.id === activeSpaceId;
                    const SpaceIcon = getSpaceIcon(space.id);
                    const tone = getSpaceToneClasses(space.id);

                    return (
                      <Link
                        key={space.id}
                        href={firstHref}
                        title={getSpaceTooltip(space, locale)}
                        aria-label={getSpaceTooltip(space, locale)}
                        aria-current={isSpaceActive ? "page" : undefined}
                        onClick={() => onTrackNavigation(firstHref, space.label[locale], space.id)}
                        className={cn(
                          "relative flex min-h-10 items-center gap-2 rounded-full px-4 py-2 cmm-text-caption font-bold transition-all duration-300 active:scale-95",
                          isSpaceActive ? "text-slate-50" : "text-slate-500 hover:text-slate-200"
                        )}
                      >
                        {isSpaceActive && (
                          <motion.div
                            layoutId="active-space"
                            className={cn("absolute inset-0 rounded-full border", tone.active)}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                        <SpaceIcon className={cn("relative z-10 h-4 w-4 shrink-0 transition-transform group-hover:scale-110", isSpaceActive ? "opacity-100" : "opacity-60")} />
                        <span className="relative z-10">{space.label[locale]}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* ACTIONS DROITE (Settings, Explorer, User) */}
              <div className="flex items-center gap-2.5">
                <Link
                  href="/explorer"
                  aria-label={locale === "fr" ? "Explorer toutes les rubriques" : "Explore all sections"}
                  className="group flex h-11 w-11 items-center justify-center rounded-full border border-slate-800/40 bg-slate-900/40 text-slate-400 transition-all hover:border-emerald-500/50 hover:bg-slate-800/60 hover:text-emerald-200 active:scale-90 shadow-md sm:h-auto sm:w-auto sm:px-4"
                >
                  <Compass className="h-4.5 w-4.5 transition-transform group-hover:rotate-12" aria-hidden="true" />
                  <span className="ml-2 hidden sm:inline cmm-text-caption font-bold uppercase tracking-widest">
                    {locale === "fr" ? "Explorer" : "Explorer"}
                  </span>
                </Link>

                <details
                  ref={preferencesMenuRef}
                  open={isPreferencesOpen}
                  onToggle={(event) => setIsPreferencesOpen(event.currentTarget.open)}
                  className="relative"
                >
                  <summary 
                    aria-label={locale === "fr" ? "Menu des préférences d'affichage et langue" : "Display and language preferences menu"}
                    className="flex h-11 w-11 list-none cursor-pointer items-center justify-center rounded-full border border-slate-800/40 bg-slate-900/40 text-slate-400 transition-all hover:border-emerald-500/50 hover:bg-slate-800/60 hover:text-emerald-200 active:scale-90 shadow-md sm:h-auto sm:w-auto sm:px-4 [&::-webkit-details-marker]:hidden"
                  >
                    <Settings2 className="h-4.5 w-4.5" aria-hidden="true" />
                    <span className="ml-2 hidden sm:inline cmm-text-caption font-bold uppercase tracking-widest">
                      {locale === "fr" ? "Réglages" : "Settings"}
                    </span>
                  </summary>

                  {isPreferencesOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="absolute right-0 top-full z-50 mt-4 w-80 rounded-[2rem] border border-slate-800 bg-slate-950/90 p-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
                    >
                      <SitePreferencesControls />
                    </motion.div>
                  )}
                </details>

                <div className="h-8 w-[1px] bg-slate-800/60 mx-1 hidden sm:block" />

                <Show when="signed-out">
                  <div className="flex items-center gap-2">
                    <SignInButton mode="modal">
                      <button className="rounded-full px-4 py-2 cmm-text-caption font-bold text-slate-400 transition hover:text-white">
                        {locale === "fr" ? "Connexion" : "Sign in"}
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="rounded-full bg-emerald-600 px-5 py-2 cmm-text-caption font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-500 active:scale-95">
                        {locale === "fr" ? "S'inscrire" : "Sign up"}
                      </button>
                    </SignUpButton>
                  </div>
                </Show>

                <Show when="signed-in">
                  <div className="flex items-center gap-4">
                    <div className="hidden xl:block">
                      {identity && <AccountIdentityChip identity={identity} />}
                    </div>
                    <NotificationBell />
                    <UserButton
                      appearance={{
                        elements: {
                          userButtonAvatarBox: "h-9 w-9 ring-2 ring-emerald-500/20 shadow-lg",
                        },
                      }}
                    />
                  </div>
                </Show>
              </div>
            </div>

            {/* RANGÉE INFÉRIEURE (SHELF) : CONTEXTE + SOUS-RUBRIQUES */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSpaceId}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex flex-col gap-3 border-t border-slate-800/40 pb-1.5 pt-3 md:flex-row md:items-center"
              >
                {/* CONTEXTE (Fil d'Ariane dynamique) */}
                <div className="flex shrink-0 items-center gap-2">
                  <div className={cn("h-1.5 w-1.5 rounded-full", activeSpace ? getSpaceToneClasses(activeSpace.id).glow : "bg-slate-700")} />
                  <p className="cmm-text-caption font-bold uppercase tracking-widest cmm-text-muted opacity-80">
                    {activeSpace ? activeSpace.label[locale] : "CleanMyMap"}
                  </p>
                  <span className="cmm-text-caption text-slate-800">/</span>
                </div>

                {/* LISTE DES SOUS-RUBRIQUES */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {activeSpaceItems.map((item) => {
                      const isItemActive = isActivePath(pathname, item.href);
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => onTrackNavigation(item.href, item.label[locale], activeSpace?.id ?? null)}
                          title={getItemTooltip(item, locale)}
                          aria-label={getItemTooltip(item, locale)}
                          className={cn(
                            "group relative flex min-h-[2.5rem] shrink-0 items-center justify-center rounded-full px-5 py-1.5 cmm-text-caption font-bold tracking-wide transition-all duration-300",
                            isItemActive
                              ? "text-emerald-400"
                              : "text-slate-400 hover:text-slate-100"
                          )}
                        >
                          {isItemActive && (
                            <motion.div
                              layoutId="active-item"
                              className="absolute inset-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 shadow-[0_4px_15px_-5px_rgba(16,185,129,0.4)]"
                              transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                            />
                          )}
                          {!isItemActive && (
                            <div className="absolute inset-0 rounded-full border border-transparent transition-colors group-hover:border-slate-800 group-hover:bg-slate-900/40" />
                          )}
                          <span className="relative z-10">{item.label[locale]}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </nav>
    </div>
 );
}
