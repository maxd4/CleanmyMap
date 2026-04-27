"use client";

import { useEffect, useMemo, useRef, useState } from"react";
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
} from"lucide-react";
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
 return `${item.label[locale]} — utilité & impact : ${item.description[locale]}`;
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
} {
 const toneBySpace = {
 home: {
 active:
"border-slate-300 bg-white cmm-text-primary shadow-[0_8px_20px_-12px_rgba(15,23,42,0.45)] dark:border-slate-600 dark:bg-slate-900",
 inactive:
"border-slate-200/80 bg-slate-50 cmm-text-secondary hover:border-slate-300 hover:bg-white hover:cmm-text-primary dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-50",
 },
 act: {
 active:
"border-amber-300 bg-amber-50 text-amber-900 shadow-[0_8px_20px_-12px_rgba(245,158,11,0.55)] dark:border-amber-700 dark:bg-amber-950/55 dark:text-amber-100",
 inactive:
"border-amber-200/70 bg-amber-50/70 text-amber-800 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-200 dark:hover:border-amber-700 dark:hover:bg-amber-950/55 dark:hover:text-amber-100",
 },
 visualize: {
 active:
"border-sky-300 bg-sky-50 text-sky-900 shadow-[0_8px_20px_-12px_rgba(14,165,233,0.55)] dark:border-sky-700 dark:bg-sky-950/55 dark:text-sky-100",
 inactive:
"border-sky-200/70 bg-sky-50/70 text-sky-800 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-900 dark:border-sky-800 dark:bg-sky-950/35 dark:text-sky-200 dark:hover:border-sky-700 dark:hover:bg-sky-950/55 dark:hover:text-sky-100",
 },
 impact: {
 active:
"border-emerald-300 bg-emerald-50 text-emerald-900 shadow-[0_8px_20px_-12px_rgba(16,185,129,0.55)] dark:border-emerald-700 dark:bg-emerald-950/55 dark:text-emerald-100",
 inactive:
"border-emerald-200/70 bg-emerald-50/70 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/55 dark:hover:text-emerald-100",
 },
 network: {
 active:
"border-violet-300 bg-violet-50 text-violet-900 shadow-[0_8px_20px_-12px_rgba(139,92,246,0.55)] dark:border-violet-700 dark:bg-violet-950/55 dark:text-violet-100",
 inactive:
"border-violet-200/70 bg-violet-50/70 text-violet-800 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-900 dark:border-violet-800 dark:bg-violet-950/35 dark:text-violet-200 dark:hover:border-violet-700 dark:hover:bg-violet-950/55 dark:hover:text-violet-100",
 },
 connect: {
 active:
 "border-pink-300 bg-pink-50 text-pink-900 shadow-[0_8px_20px_-12px_rgba(236,72,153,0.55)] dark:border-pink-700 dark:bg-pink-950/55 dark:text-pink-100",
 inactive:
 "border-pink-200/70 bg-pink-50/70 text-pink-800 hover:border-pink-300 hover:bg-pink-50 hover:text-pink-900 dark:border-pink-800 dark:bg-pink-950/35 dark:text-pink-200 dark:hover:border-pink-700 dark:hover:bg-pink-950/55 dark:hover:text-pink-100",
 },
 learn: {
 active:
"border-rose-300 bg-rose-50 text-rose-900 shadow-[0_8px_20px_-12px_rgba(244,63,94,0.55)] dark:border-rose-700 dark:bg-rose-950/55 dark:text-rose-100",
 inactive:
"border-rose-200/70 bg-rose-50/70 text-rose-800 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-900 dark:border-rose-800 dark:bg-rose-950/35 dark:text-rose-200 dark:hover:border-rose-700 dark:hover:bg-rose-950/55 dark:hover:text-rose-100",
 },
 pilot: {
 active:
"border-indigo-300 bg-indigo-50 text-indigo-900 shadow-[0_8px_20px_-12px_rgba(99,102,241,0.55)] dark:border-indigo-700 dark:bg-indigo-950/55 dark:text-indigo-100",
 inactive:
"border-indigo-200/70 bg-indigo-50/70 text-indigo-800 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/35 dark:text-indigo-200 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/55 dark:hover:text-indigo-100",
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

 // Synchronize menu state with pathname changes during render to avoid cascading renders
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
 <div aria-label="Navigation principale" className="relative z-30 w-full">
 <nav
 aria-label="Navigation principale"
 className={[
"border-b border-slate-200/80 bg-gradient-to-r from-white via-slate-50 to-white transition-shadow duration-300 dark:border-slate-800/80 dark:bg-gradient-to-r dark:from-slate-950 dark:via-slate-900 dark:to-slate-950",
 isScrolled
 ?"shadow-[0_26px_60px_-38px_rgba(15,23,42,0.42)]"
 :"shadow-[0_14px_34px_-30px_rgba(15,23,42,0.32)]",
 ].join("")}
 >
 <div className="mx-auto w-full px-4 sm:px-6 xl:px-10">
 <div className="flex flex-col gap-3 py-2.5 sm:py-3">
 <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
 <div className="hidden min-w-[11rem] items-center gap-2 xl:flex">
 <Link
 href="/"
 className="inline-flex items-center rounded-full border border-slate-200/90 bg-white px-3.5 py-2 cmm-text-caption font-bold uppercase tracking-[0.18em] cmm-text-secondary shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/70 hover:text-emerald-800 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-emerald-700 dark:hover:bg-slate-800 dark:hover:text-emerald-200"
 onClick={() => onTrackNavigation("/","CleanMyMap", null)}
 >
 CleanMyMap
 </Link>
 </div>

 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-1 overflow-x-auto rounded-[1.1rem] border border-slate-200/90 bg-slate-50 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] scrollbar-none dark:border-slate-800/80 dark:bg-slate-900/80">
 {spaces.map((space) => {
 const firstHref = space.items[0]?.href ??"/dashboard";
 const isSpaceActive = space.id === activeSpaceId;
 const SpaceIcon = getSpaceIcon(space.id);
 const tone = getSpaceToneClasses(space.id);
 return (
 <Link
 key={space.id}
 href={firstHref}
 title={getSpaceTooltip(space, locale)}
 aria-label={getSpaceTooltip(space, locale)}
 aria-current={isSpaceActive ?"page" : undefined}
 onClick={() =>
 onTrackNavigation(firstHref, space.label[locale], space.id)
 }
 className={[
"inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 cmm-text-caption font-semibold transition sm:cmm-text-small",
 isSpaceActive ? tone.active : tone.inactive,
 ].join("")}
 >
 <SpaceIcon className="h-4 w-4 shrink-0" />
 <span>{space.label[locale]}</span>
 {isSpaceActive ? (
 <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
 ) : null}
 </Link>
 );
 })}
 </div>
 </div>

 <div className="flex flex-wrap items-center justify-end gap-2 lg:flex-nowrap">
 <Link
 href="/explorer"
 className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700 dark:hover:bg-slate-800 dark:hover:text-slate-100 sm:cmm-text-small"
 >
 <Compass className="h-4 w-4" />
 <span className="hidden sm:inline">
 {locale ==="fr" ?"Plan du site" :"Site map"}
 </span>
 </Link>

 <details
 ref={preferencesMenuRef}
 open={isPreferencesOpen}
 onToggle={(event) => {
 const isOpen = event.currentTarget.open;
 setIsPreferencesOpen(isOpen);
 }}
 className="relative shrink-0"
 >
 <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700 dark:hover:bg-slate-800 dark:hover:text-slate-100 sm:px-3.5 sm:cmm-text-small [&::-webkit-details-marker]:hidden">
 <Settings2 className="h-4 w-4" />
 <span className="hidden sm:inline">
 {locale ==="fr" ?"Réglages" :"Settings"}
 </span>
 </summary>

 {isPreferencesOpen ? (
 <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-3 shadow-2xl shadow-slate-950/15 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
 <SitePreferencesControls />
 </div>
 ) : null}
 </details>

 <Show when="signed-out">
 <div className="flex items-center gap-2">
 <SignInButton mode="modal">
 <button className="rounded-full border border-slate-200 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary transition hover:border-emerald-200 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700 dark:hover:text-emerald-200 sm:cmm-text-small">
 {locale ==="fr" ?"Connexion" :"Sign in"}
 </button>
 </SignInButton>
 <SignUpButton mode="modal">
 <button className="rounded-full bg-emerald-600 px-4 py-2 cmm-text-caption font-semibold text-white shadow-sm shadow-emerald-600/15 transition hover:bg-emerald-700 sm:cmm-text-small">
 {locale ==="fr" ?"Créer un compte" :"Sign up"}
 </button>
 </SignUpButton>
 </div>
 </Show>

 <Show when="signed-in">
 <div className="flex items-center gap-3">
 <div className="hidden sm:block">
 {identity ? <AccountIdentityChip identity={identity} /> : null}
 </div>
 <NotificationBell />
 <UserButton
 appearance={{
 elements: {
 userButtonAvatarBox:"h-8 w-8 ring-2 ring-emerald-500/20",
 },
 }}
 />
 </div>
 </Show>
 </div>
 </div>

 <div className="flex flex-col gap-2 rounded-[1.15rem] border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.35)] dark:border-slate-800/70 dark:bg-slate-950 md:flex-row md:items-center md:gap-3">
 <p className="min-w-0 cmm-text-caption font-medium cmm-text-muted">
 {contextText}
 </p>

 <div className="min-w-0 flex-1">
 <div className="flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-none">
 {activeSpaceItems.map((item) => {
 const isItemActive = isActivePath(pathname, item.href);
 return (
 <Link
 key={item.id}
 href={item.href}
 onClick={() =>
 onTrackNavigation(
 item.href,
 item.label[locale],
 activeSpace?.id ?? null,
 )
 }
 title={getItemTooltip(item, locale)}
 aria-label={getItemTooltip(item, locale)}
 className={[
 "inline-flex min-h-[2.5rem] shrink-0 items-center justify-center rounded-full border px-4 py-1.5 cmm-text-caption font-bold tracking-wide transition-all duration-300 sm:cmm-text-small",
 isItemActive
 ? "border-violet-500/20 bg-violet-500/10 text-violet-700 shadow-[0_4px_12px_-4px_rgba(139,92,246,0.3)] dark:border-violet-500/40 dark:bg-violet-500/20 dark:text-violet-300"
 : "border-slate-200/60 bg-white/50 cmm-text-secondary hover:border-violet-300/50 hover:bg-white hover:cmm-text-primary hover:shadow-md dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-violet-600 dark:hover:bg-slate-900 dark:hover:text-slate-100",
 ].join(" ")}
 >
 {item.label[locale]}
 {isItemActive && (
 <span className="relative ml-2 flex h-2 w-2">
 <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75"></span>
 <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-500"></span>
 </span>
 )}
 </Link>
 );
 })}
 {activeSpaceItems.length === 0 ? (
 <span className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-dashed border-slate-300 px-3 py-1.5 cmm-text-caption cmm-text-muted dark:border-slate-700 dark:cmm-text-muted">
 {locale ==="fr"
 ?"Aucune rubrique dans ce bloc"
 :"No page in this block"}
 </span>
 ) : null}
 </div>
 </div>
 </div>
 </div>
 </div>
 </nav>
 </div>
 );
}
