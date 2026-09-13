"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import useSWR from "swr";
import Link from "next/link";

import type { UserIdentity } from "@/lib/authz";
import {
  fetchCurrentAccountIdentity,
  type CurrentAccountIdentity,
} from "@/lib/account/current-account-identity";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  getActiveSpaceForPath,
  getNavigationSpacesForProfile,
  type NavigationSpace,
} from "@/lib/navigation";
import { getProfileLabel } from "@/lib/profiles";
import { trackNavigationClick } from "@/lib/analytics/navigation-client";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./global-search";
import { useAdaptiveRibbonChrome } from "./app-navigation-ribbon-theme";
import { AppNavigationBlockDropdown } from "./app-navigation-block-dropdown";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AppNavigationTreeMenu } from "./app-navigation-tree-menu";
import {
  RibbonAccountActions,
  type AppNavigationRibbonProps,
  type ClerkUserLike,
} from "./app-navigation-ribbon-account";
import { useRibbonActivityStatus } from "./app-navigation-ribbon-activity";
import { RibbonMenus } from "./app-navigation-ribbon-menus";
import { resolveOpenNavigationSpaceId } from "./navigation-block-trigger-state";

type AppNavigationRibbonShellProps = AppNavigationRibbonProps & {
  pathname: string;
  user: ClerkUserLike | null;
  authStateReady: boolean;
  showAccountActions: boolean;
};

function AppNavigationRibbonShell({
  currentProfile,
  profileLabel,
  identity,
  pathname,
  user,
  authStateReady,
  showAccountActions,
}: AppNavigationRibbonShellProps) {
  const { locale, displayMode } = useSitePreferences();
  const ribbonRef = useRef<HTMLElement | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [openSpaceId, setOpenSpaceId] = useState<NavigationSpace["id"] | null>(null);
  const { data: hydratedIdentity } = useSWR<CurrentAccountIdentity | null>(
    authStateReady
      ? ["current-account-identity", user?.id ?? "anonymous-session"]
      : null,
    fetchCurrentAccountIdentity,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      dedupingInterval: 120_000,
    },
  );
  const effectiveIdentity: UserIdentity | null = identity ?? hydratedIdentity ?? null;
  const effectiveProfile = effectiveIdentity?.activeProfile ?? currentProfile ?? "benevole";
  const effectiveProfileLabel =
    profileLabel ?? getProfileLabel(effectiveProfile, locale);

  const ribbonChrome = useAdaptiveRibbonChrome(
    ribbonRef,
    `${pathname}:${displayMode}:${locale}:${effectiveProfile}`,
  );

  const ribbonActivity = useRibbonActivityStatus(user);

  const spaces = useMemo(() => {
    const rawSpaces = getNavigationSpacesForProfile(effectiveProfile, displayMode, locale);
    return rawSpaces;
  }, [displayMode, effectiveProfile, locale]);

  const activeSpaceId = getActiveSpaceForPath(effectiveProfile, pathname, displayMode);
  const isAuthenticated = showAccountActions && Boolean(user || effectiveIdentity);
  const identityForBubble = effectiveIdentity;

  function onTrackNavigation(href: string, label: string, spaceId: string | null) {
    trackNavigationClick({
      profile: effectiveProfile,
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


  return (
    <div
      data-cmm-capture-sticky
      data-cmm-capture-stabilize
      className="sticky top-[var(--app-ribbon-top-offset,0rem)] z-50 w-full"
    >
      <nav
        ref={ribbonRef}
        aria-label={locale === "fr" ? "Barre de navigation principale" : "Main navigation bar"}
        className={cn(
          "w-full border-b border-white/8 bg-transparent backdrop-blur-2xl transition-[box-shadow,border-color,background-color] duration-300 supports-[backdrop-filter]:backdrop-blur-2xl",
          isScrolled
            ? "shadow-[0_14px_40px_-18px_rgba(2,6,23,0.72)]"
            : "shadow-[0_8px_24px_-12px_rgba(2,6,23,0.56)]",
        )}
        style={ribbonChrome}
      >
        <div className="flex w-full min-w-0 items-center gap-2 px-3 py-2.5 sm:px-5 lg:gap-2 xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:px-7 xl:py-3">
          <p className="sr-only">
            {locale === "fr" ? "Profil actif" : "Active profile"}: {effectiveProfileLabel}
          </p>

          <div className="flex min-w-0 items-center gap-2 xl:col-start-1">
            <Link
              href="/"
              prefetch={false}
              onClick={() => onTrackNavigation("/", "Accueil", null)}
              className="group inline-flex min-h-12 shrink-0 items-center gap-2 rounded-[1.15rem] border border-sky-100/18 bg-gradient-to-br from-sky-500 via-blue-500 to-cyan-500 px-3.5 pr-4 text-white shadow-[0_18px_36px_-22px_rgba(37,99,235,0.92)] transition-[border-color,box-shadow,background-color] hover:border-sky-50/28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 xl:h-10 xl:min-h-0"
              aria-label="Accueil"
            >
              <BrandLogo
                alt=""
                className="h-8 w-8 shrink-0 object-contain"
                priority
                sizes="2rem"
              />
              <span className="hidden xl:inline cmm-text-caption font-black uppercase tracking-[0.18em]">
                Accueil
              </span>
            </Link>

            <div className="hidden min-w-0 flex-1 items-center xl:flex">
              <div className="w-full max-w-[15rem]">
                <GlobalSearch currentProfile={effectiveProfile} />
              </div>
            </div>
          </div>

          <div className="hidden items-center justify-center xl:col-start-2 xl:flex">
            <nav
              aria-label={locale === "fr" ? "Navigation par blocs" : "Block navigation"}
              className="flex w-[15rem] shrink-0 flex-nowrap items-center justify-center gap-0.5 rounded-full border border-white/8 bg-white/[0.05] p-px shadow-[0_18px_36px_-28px_rgba(2,6,23,0.8)]"
            >
              {spaces.map((space) => (
                <AppNavigationBlockDropdown
                  key={space.id}
                  activeSpaceId={activeSpaceId}
                  displayMode={displayMode}
                  locale={locale}
                  onTrackNavigation={onTrackNavigation}
                  onOpenChange={(spaceId, open) => {
                    setOpenSpaceId((currentSpaceId) =>
                      resolveOpenNavigationSpaceId(currentSpaceId, spaceId, open),
                    );
                  }}
                  open={openSpaceId === space.id}
                  pathname={pathname}
                  space={space}
                />
              ))}
            </nav>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-2.5 xl:col-start-3 xl:ml-0 xl:justify-end">
            <div className="lg:hidden">
              <AppNavigationTreeMenu
                key={`mobile-tree-${pathname}`}
                activeSpaceId={activeSpaceId}
                idBase="mobile-navigation-tree"
                locale={locale}
                onTrackNavigation={onTrackNavigation}
                pathname={pathname}
                ribbonChrome={ribbonChrome}
                spaces={spaces}
              />
            </div>

            <RibbonMenus
              key={`ribbon-menus-${pathname}`}
              {...({
                locale,
                pathname,
                ribbonChrome,
                onTrackNavigation,
              } as React.ComponentProps<typeof RibbonMenus>)}
            />

            <RibbonAccountActions
              locale={locale}
              isAuthenticated={isAuthenticated}
              onTrackNavigation={onTrackNavigation}
              ribbonChrome={ribbonChrome}
              effectiveIdentity={effectiveIdentity}
              identityForBubble={identityForBubble}
              user={user}
              activity={ribbonActivity}
            />
          </div>
        </div>
      </nav>
    </div>
  );
}

export function AppNavigationRibbonPublic({
  currentProfile,
  profileLabel,
  identity,
  pathname,
}: AppNavigationRibbonProps & { pathname: string }) {
  const { isLoaded, user } = useUser();
  const userResource = user ?? null;

  return (
    <AppNavigationRibbonShell
      currentProfile={currentProfile}
      profileLabel={profileLabel}
      identity={identity}
      pathname={pathname}
      user={userResource}
      authStateReady={isLoaded}
      showAccountActions
    />
  );
}

export function AppNavigationRibbonProtected({
  currentProfile,
  profileLabel,
  identity,
  pathname,
}: AppNavigationRibbonProps & { pathname: string }) {
  const { isLoaded, user } = useUser();
  const userResource = user ?? null;

  return (
    <AppNavigationRibbonShell
      currentProfile={currentProfile}
      profileLabel={profileLabel}
      identity={identity}
      pathname={pathname}
      user={userResource}
      authStateReady={isLoaded}
      showAccountActions
    />
  );
}
