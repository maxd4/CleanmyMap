"use client";

import Link from"next/link";
import { usePathname } from"next/navigation";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import { trackNavigationClick } from"@/lib/analytics/navigation-client";
import {
 getActiveSpaceForPath,
 getNavigationSpacesForProfile,
 getPilotFallbackItems,
} from"@/lib/navigation";
import type { AppProfile } from"@/lib/profiles";

type BlockSwitcherProps = {
 currentProfile: AppProfile;
};

export function BlockSwitcher({ currentProfile }: BlockSwitcherProps) {
 const pathname = usePathname();
 const { locale, displayMode } = useSitePreferences();
 const spaces = getNavigationSpacesForProfile(currentProfile, displayMode, locale);
 const activeSpaceId = getActiveSpaceForPath(currentProfile, pathname, displayMode);
 const activeSpace =
 spaces.find((space) => space.id === activeSpaceId) ??
 spaces.find((space) => space.items.length > 0) ??
 spaces[0];
 const activeItem = activeSpace?.items.find(
 (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
 );
 const activeSpaceItems =
 activeSpace?.id ==="pilot" && activeSpace.items.length === 0
 ? getPilotFallbackItems(locale)
 : activeSpace?.items ?? [];

 function onTrackNavigation(href: string, label: string, spaceId: string | null) {
 trackNavigationClick({
 profile: currentProfile,
 spaceId,
 href,
 label,
 });
 }

 return (
 <div className="w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-white/40 bg-white/85 shadow-xl backdrop-blur-md lg:w-1/2">
 <div className="flex items-center gap-1 overflow-x-auto px-2 pb-1 pt-2 scrollbar-none">
 {spaces.map((space) => {
 const firstHref = space.items[0]?.href ??"/dashboard";
 const isActive = space.id === activeSpaceId;
 return (
 <Link
 key={space.id}
 href={firstHref}
 title={space.label[locale]}
 onClick={() =>
 onTrackNavigation(firstHref, space.label[locale], space.id)
 }
 className={`flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 transition shrink-0 sm:min-w-16 ${
 isActive
 ?"bg-emerald-100 text-emerald-900"
 :"cmm-text-muted hover:bg-slate-100 hover:cmm-text-primary"
 }`}
 >
 <span className="text-2xl leading-none sm:text-3xl">{space.icon}</span>
 <span
 className={`hidden text-[9px] font-semibold uppercase leading-none tracking-wide sm:block ${
 isActive ?"text-emerald-800" :"cmm-text-muted"
 }`}
 >
 {space.label[locale].split("")[0]}
 </span>
 </Link>
 );
 })}
 </div>

 <div className="border-t border-slate-200/80 px-3 py-2">
 <div className="flex items-center justify-between gap-2">
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.16em] cmm-text-muted">
 {locale ==="fr" ?"Rubriques du bloc actif" :"Active block pages"}
 </p>
 {activeSpace ? (
 <p className="truncate cmm-text-caption font-medium cmm-text-secondary">
 {activeSpace.icon} {activeSpace.label[locale]}
 </p>
 ) : null}
 </div>

 <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
 {activeSpaceItems.map((item) => {
 const isActive =
 pathname === item.href || pathname.startsWith(`${item.href}/`);

 return (
 <Link
 key={item.id}
 href={item.href}
 onClick={() => onTrackNavigation(item.href, item.label[locale], activeSpace?.id ?? null)}
 title={item.description[locale]}
 className={`inline-flex shrink-0 items-center rounded-full border px-3 py-2 cmm-text-small font-medium transition ${
 isActive
 ?"border-emerald-300 bg-emerald-50 text-emerald-900"
 :"border-slate-200 bg-white cmm-text-secondary hover:border-emerald-200 hover:bg-emerald-50 hover:cmm-text-primary"
 }`}
 >
 {item.label[locale]}
 {activeItem?.id === item.id ? (
 <span className="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
 ) : null}
 </Link>
 );
 })}
 {activeSpaceItems.length === 0 ? (
 <span className="inline-flex shrink-0 items-center rounded-full border border-dashed border-slate-300 px-3 py-2 cmm-text-small cmm-text-muted">
 {locale ==="fr"
 ?"Aucune rubrique dans ce bloc"
 :"No page in this block"}
 </span>
 ) : null}
 </div>
 </div>
 </div>
 );
}
