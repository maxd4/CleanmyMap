"use client";

import { useEffect, useRef, useState } from "react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { UserIdentity } from "@/lib/authz";
import { trackNavigationClick } from "@/lib/analytics/navigation-client";
import { NotificationBell } from "@/components/navigation/notification-bell";
import {
  getActiveSpaceForPath,
  getNavigationSpacesForProfile,
  getPilotFallbackItems,
} from "@/lib/navigation";
import { SitePreferencesControls } from "@/components/ui/site-preferences-controls";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { AppProfile } from "@/lib/profiles";
import { AccountIdentityChip } from "@/components/account/account-identity-chip";

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
  return segments.join(" / ");
}

function getItemTooltip(item: { label: Record<string, string>; description: Record<string, string> }, locale: string) {
  return `${item.label[locale]} — utilité & impact : ${item.description[locale]}`;
}

function getSpaceTooltip(space: { label: Record<string, string>; items: { label: Record<string, string> }[] }, locale: string) {
  const itemCount = space.items.length;
  return `${space.label[locale]} — ${itemCount} rubrique${itemCount > 1 ? "s" : ""} dans ce bloc.`;
}

export function AppNavigationRibbon({
  currentProfile,
  profileLabel,
  identity,
}: AppNavigationRibbonProps) {
  const pathname = usePathname();
  const hideTimerRef = useRef<number | null>(null);
  const [isRibbonVisible, setRibbonVisible] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
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

  const contextText = contextLabel(
    profileLabel,
    activeSpace ? activeSpace.label[locale] : undefined,
    activeItem ? activeItem.label[locale] : undefined,
  );

  function openRibbon() {
    setRibbonVisible(true);

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }

  function closeRibbon() {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    setRibbonVisible(false);
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: none), (pointer: coarse)");

    const syncPointerMode = () => {
      setIsCoarsePointer(mediaQuery.matches);
      setRibbonVisible(false);
    };

    syncPointerMode();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncPointerMode);
      return () => {
        mediaQuery.removeEventListener("change", syncPointerMode);
        if (hideTimerRef.current !== null) {
          window.clearTimeout(hideTimerRef.current);
        }
      };
    }

    mediaQuery.addListener(syncPointerMode);

    return () => {
      mediaQuery.removeListener(syncPointerMode);
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    closeRibbon();
  }, [pathname]);

  return (
    <div
      aria-label="Navigation principale"
      className="fixed left-0 right-0 top-0 z-50 w-full"
      style={{
        top: "var(--cleanmymap-weather-warning-height, 0px)",
        pointerEvents: "none",
      }}
    >
      {isCoarsePointer ? (
        <button
          type="button"
          onClick={isRibbonVisible ? closeRibbon : openRibbon}
          aria-label={isRibbonVisible ? "Masquer la navigation" : "Afficher la navigation"}
          aria-controls="app-navigation-ribbon"
          aria-expanded={isRibbonVisible}
          className="pointer-events-auto absolute right-4 top-2 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/95 px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur-md transition hover:border-emerald-200 hover:text-emerald-700 dark:border-slate-800/80 dark:bg-slate-950/90 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:text-emerald-300"
        >
          <span className="inline-flex items-center gap-1.5">
            <span>Navigation</span>
            {isRibbonVisible ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </span>
        </button>
      ) : (
        <div
          aria-hidden="true"
          onMouseEnter={openRibbon}
          onMouseLeave={() => {
            if (hideTimerRef.current !== null) {
              window.clearTimeout(hideTimerRef.current);
            }

            hideTimerRef.current = window.setTimeout(() => {
              setRibbonVisible(false);
            }, 180);
          }}
          className="pointer-events-auto absolute inset-x-0 top-0 h-4"
        />
      )}

      <nav
        aria-label="Navigation principale"
        id="app-navigation-ribbon"
        aria-hidden={!isRibbonVisible}
        onMouseEnter={openRibbon}
        onMouseLeave={() => {
          if (!isCoarsePointer) {
            if (hideTimerRef.current !== null) {
              window.clearTimeout(hideTimerRef.current);
            }

            hideTimerRef.current = window.setTimeout(() => {
              setRibbonVisible(false);
            }, 180);
          }
        }}
        className={`border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md transition-[transform,opacity] duration-300 ease-out will-change-transform dark:border-slate-800/80 dark:bg-slate-950/90 ${
          isRibbonVisible
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-[110%] opacity-0"
        }`}
      >
        <div className="border-b border-slate-200/70 px-4 py-3 sm:px-8 dark:border-slate-800/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 font-semibold text-slate-800 transition hover:text-emerald-700 dark:text-slate-100 dark:hover:text-emerald-400"
              >
                <Image
                  src="/brand/nouveau-logo.png"
                  alt="Logo CleanMyMap"
                  width={22}
                  height={12}
                  className="h-4 w-auto shrink-0 sm:h-5"
                />
                <span className="whitespace-nowrap text-[11px] tracking-[0.18em] uppercase sm:text-xs">
                  CleanMyMap
                </span>
              </Link>
              <p className="mt-1 truncate text-[10px] font-medium text-slate-500 sm:text-[11px] dark:text-slate-400">
                {contextText}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link
                href="/explorer"
                className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950 dark:hover:text-emerald-300"
              >
                Explorer
              </Link>
              <SitePreferencesControls />
              <Show when="signed-out">
                <div className="flex items-center gap-2">
                  <SignInButton mode="modal">
                    <button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:text-emerald-300">
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="rounded-full bg-emerald-600 px-4 py-1.5 text-[11px] font-bold text-white shadow-md shadow-emerald-600/10 transition hover:bg-emerald-700">
                      Sign up
                    </button>
                  </SignUpButton>
                </div>
              </Show>
              <Show when="signed-in">
                <div className="flex items-center gap-3">
                  {identity ? <AccountIdentityChip identity={identity} /> : null}
                  <NotificationBell />
                  <UserButton
                    appearance={{
                      elements: {
                        userButtonAvatarBox: "h-8 w-8 ring-2 ring-emerald-500/20",
                      },
                    }}
                  />
                </div>
              </Show>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 sm:px-8">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
            {spaces.map((space) => {
              const firstHref = space.items[0]?.href ?? "/dashboard";
              const isSpaceActive = space.id === activeSpaceId;
              return (
                <Link
                  key={space.id}
                  href={firstHref}
                  title={getSpaceTooltip(space, locale)}
                  aria-label={getSpaceTooltip(space, locale)}
                  aria-current={isSpaceActive ? "page" : undefined}
                  onClick={() =>
                    onTrackNavigation(firstHref, space.label[locale], space.id)
                  }
                  className={`group inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold transition sm:px-4 sm:text-xs ${
                    isSpaceActive
                      ? "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950 dark:text-emerald-100"
                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  }`}
                >
                  <span className="text-base leading-none sm:text-lg">{space.icon}</span>
                  <span
                    className={`overflow-hidden whitespace-nowrap text-left transition-all duration-200 ease-out ${
                      isSpaceActive
                        ? "max-w-40 opacity-100"
                        : "max-w-0 opacity-0 group-hover:max-w-40 group-hover:opacity-100 group-focus-visible:max-w-40 group-focus-visible:opacity-100"
                    }`}
                  >
                    {space.label[locale]}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  title={getItemTooltip(item, locale)}
                  aria-label={getItemTooltip(item, locale)}
                  className={`inline-flex min-h-10 w-full items-center justify-center rounded-full border px-3 py-2 text-center text-[11px] font-medium transition sm:text-xs ${
                    isItemActive
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950 dark:text-emerald-100"
                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  }`}
                >
                  {item.label[locale]}
                </Link>
              );
            })}
            {activeSpaceItems.length === 0 ? (
              <span className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-dashed border-slate-300 px-3 py-2 text-center text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {locale === "fr"
                  ? "Aucune rubrique dans ce bloc"
                  : "No page in this block"}
              </span>
            ) : null}
          </div>
        </div>
      </nav>
    </div>
  );
}
