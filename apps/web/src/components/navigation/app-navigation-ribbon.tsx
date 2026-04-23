"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { trackNavigationClick } from "@/lib/analytics/navigation-client";
import {
  getActiveSpaceForPath,
  getNavigationSpacesForProfile,
  getPilotFallbackItems,
} from "@/lib/navigation";
import type { AppProfile } from "@/lib/profiles";

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AppNavigationRibbonProps = {
  currentProfile: AppProfile;
  profileLabel: string;
};

export function AppNavigationRibbon({
  currentProfile,
  profileLabel,
}: AppNavigationRibbonProps) {
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
    activeSpace?.id === "pilot" && activeSpace.items.length === 0
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
    <nav
      aria-label="Navigation principale"
      className="fixed left-1/2 top-16 z-50 w-[calc(100vw-0.75rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/40 bg-white/90 shadow-xl backdrop-blur-md sm:w-[calc(100vw-1.5rem)] lg:w-[min(1200px,calc(100vw-2rem))]"
    >
      <div className="border-b border-slate-200/80 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500 sm:text-xs">
            <Link href="/dashboard" className="font-semibold text-slate-700 hover:text-emerald-700">
              CleanMyMap
            </Link>
            <span className="text-slate-300">/</span>
            <span className="truncate font-medium text-slate-500">{profileLabel}</span>
            {activeSpace ? (
              <>
                <span className="hidden rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400 lg:inline-flex">
                  Bloc
                </span>
                <span className="hidden text-slate-300 lg:inline">›</span>
                <span className="text-slate-300 lg:hidden">/</span>
                <span className="text-base leading-none">{activeSpace.icon}</span>
                <span className="truncate font-medium text-slate-700">
                  {activeSpace.label[locale]}
                </span>
              </>
            ) : null}
            {activeItem ? (
              <>
                <span className="hidden text-slate-300 lg:inline">›</span>
                <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-700 lg:inline-flex">
                  Rubrique
                </span>
                <span className="text-slate-300 lg:hidden">/</span>
                <span className="truncate font-semibold text-emerald-800">
                  {activeItem.label[locale]}
                </span>
              </>
            ) : null}
          </div>
          <Link
            href="/explorer"
            className="hidden shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 sm:inline-flex"
          >
            Explorer
          </Link>
        </div>
      </div>

      <div className="grid gap-2 px-3 py-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {spaces.map((space) => {
            const firstHref = space.items[0]?.href ?? "/dashboard";
            const isSpaceActive = space.id === activeSpaceId;
            return (
              <Link
                key={space.id}
                href={firstHref}
                title={space.label[locale]}
                onClick={() =>
                  onTrackNavigation(firstHref, space.label[locale], space.id)
                }
                className={`flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition sm:min-w-28 ${
                  isSpaceActive
                    ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-slate-800"
                }`}
              >
                <span className="text-lg leading-none">{space.icon}</span>
                <span className="hidden min-w-0 truncate sm:block">
                  {space.label[locale].split(" ")[0]}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {locale === "fr" ? "Rubriques du bloc actif" : "Active block pages"}
          </p>
          {activeSpace ? (
            <p className="truncate text-[10px] font-medium text-slate-600 sm:text-xs">
              {activeSpace.label[locale]}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {activeSpaceItems.map((item) => {
            const isItemActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() =>
                  onTrackNavigation(item.href, item.label[locale], activeSpace?.id ?? null)
                }
                title={item.description[locale]}
                className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-[11px] font-medium transition sm:text-xs ${
                  isItemActive
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-slate-800"
                }`}
              >
                {item.label[locale]}
              </Link>
            );
          })}
          {activeSpaceItems.length === 0 ? (
            <span className="inline-flex shrink-0 items-center rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-[11px] text-slate-500 sm:text-xs">
              {locale === "fr"
                ? "Aucune rubrique dans ce bloc"
                : "No page in this block"}
            </span>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
