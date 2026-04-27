"use client";

import Link from"next/link";
import { usePathname } from"next/navigation";
import { useState } from"react";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import { trackNavigationClick } from"@/lib/analytics/navigation-client";
import {
 getActiveSpaceForPath,
 getNavigationSpacesForProfile,
 getPilotFallbackItems,
 type NavigationBlockId,
} from"@/lib/navigation";
import type { AppProfile } from"@/lib/profiles";

function isActive(pathname: string, href: string): boolean {
 if (href ==="/dashboard") return pathname === href;
 return pathname === href || pathname.startsWith(`${href}/`);
}

type AppSidebarProps = {
 currentProfile: AppProfile;
};

export function AppSidebar({ currentProfile }: AppSidebarProps) {
 const pathname = usePathname();
 const { locale, displayMode } = useSitePreferences();
 const spaces = getNavigationSpacesForProfile(currentProfile, displayMode, locale);
 const activeSpaceId = getActiveSpaceForPath(currentProfile, pathname, displayMode);
 const [openBlocks, setOpenBlocks] = useState<Set<NavigationBlockId>>(
 () => new Set(activeSpaceId ? [activeSpaceId] : ["home"]),
 );
 const [collapsed, setCollapsed] = useState(false);

 function toggleBlock(id: NavigationBlockId) {
 setOpenBlocks((prev) => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 });
 }

 function getSpaceItems(space: (typeof spaces)[number]) {
 if (space.id ==="pilot" && space.items.length === 0) {
 return getPilotFallbackItems(locale);
 }
 return space.items;
 }

 return (
 <aside
 className={`hidden lg:flex flex-col shrink-0 transition-all duration-300 ${
 collapsed ?"w-14" :"w-56"
 }`}
 >
 {/* Collapse toggle */}
 <button
 onClick={() => setCollapsed((c) => !c)}
 title={collapsed ? (locale ==="fr" ?"Déplier" :"Expand") : (locale ==="fr" ?"Replier" :"Collapse")}
 className="mb-2 self-end rounded-lg border border-white/40 bg-white/60 backdrop-blur-md p-1.5 cmm-text-muted hover:text-emerald-700 transition"
 >
 {collapsed ?"→" :"←"}
 </button>

 <nav className="flex flex-col gap-1 rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md p-2 shadow-xl overflow-y-auto max-h-[calc(100vh-8rem)]">
 {spaces.map((space) => {
 const isOpen = openBlocks.has(space.id);
 const isBlockActive = space.id === activeSpaceId;

 return (
 <div key={space.id}>
 {/* Bloc header */}
 <button
 onClick={() => toggleBlock(space.id)}
 className={`w-full flex items-center gap-2 rounded-xl px-2 py-2 text-left transition ${
 isBlockActive
 ?"bg-emerald-50/80 text-emerald-900"
 :"cmm-text-secondary hover:bg-slate-100/60"
 }`}
 >
 <span className="text-base leading-none">{space.icon}</span>
 {!collapsed && (
 <>
 <span className="flex-1 cmm-text-caption font-semibold uppercase tracking-wide truncate">
 {space.label[locale]}
 </span>
 <span className="cmm-text-muted cmm-text-caption">{isOpen ?"▾" :"▸"}</span>
 </>
 )}
 </button>

 {/* Rubriques */}
 {!collapsed && isOpen && (
 <ul className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-emerald-100 pl-2">
 {getSpaceItems(space).map((item) => {
 const active = isActive(pathname, item.href);
 return (
 <li key={item.id}>
 <Link
 href={item.href}
 onClick={() =>
 trackNavigationClick({
 profile: currentProfile,
 spaceId: space.id,
 href: item.href,
 label: item.label[locale],
 })
 }
 className={`block rounded-lg px-2 py-1.5 cmm-text-caption transition ${
 active
 ?"bg-emerald-100 font-semibold text-emerald-900"
 :"cmm-text-secondary hover:bg-emerald-50 hover:text-emerald-800"
 }`}
 >
 {item.label[locale]}
 </Link>
 </li>
 );
 })}
 {space.items.length === 0 && space.id !=="pilot" && (
 <li className="cmm-text-caption italic cmm-text-muted px-2 py-1">
 {locale ==="fr" ?"Aucune page" :"No pages"}
 </li>
 )}
 </ul>
 )}
 </div>
 );
 })}
 </nav>
 </aside>
 );
}
