"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
  getLocalizedText,
  type NavigationSpace,
} from "@/lib/navigation";
import { getProfileLabel } from "@/lib/profiles";
import { trackNavigationClick } from "@/lib/analytics/navigation-client";
import { cn } from "@/lib/utils";
import { CmmIcon } from "@/components/ui/cmm-icon";
import { GlobalSearch } from "./global-search";
import { useAdaptiveRibbonChrome } from "./app-navigation-ribbon-theme";
import { APP_NAVIGATION_RIBBON_VARIANT } from "./app-navigation-ribbon-variant";
import { AppNavigationBlockDropdown } from "./app-navigation-block-dropdown";
import { getNavigationBlockIcon } from "./app-navigation-block-icon";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AppNavigationTreeMenu } from "./app-navigation-tree-menu";
import {
  RibbonAccountActions,
  RibbonAccountActionsFallback,
  type AppNavigationRibbonProps,
  type ClerkUserLike,
} from "./app-navigation-ribbon-account";
import { useRibbonActivityStatus } from "./app-navigation-ribbon-activity";
import {
  RibbonFeedbackMenu,
  RibbonPreferencesMenu,
} from "./app-navigation-ribbon-menus";
import {
  resolveOpenNavigationSpaceId,
  resolveOpenRibbonUtilityMenuId,
  type RibbonUtilityMenuId,
} from "./navigation-block-trigger-state";
import {
  getNavigationRibbonIndicatorLeft,
  NAVIGATION_RIBBON_INDICATOR_WIDTH_PX,
  NAVIGATION_RIBBON_MENISCUS_INDICATOR_HEIGHT_PX,
} from "./app-navigation-ribbon-geometry";

type AppNavigationRibbonShellProps = AppNavigationRibbonProps & {
  pathname: string;
  user: ClerkUserLike | null;
  authStateReady: boolean;
  showAccountActions: boolean;
};

type OpenRibbonUtilityMenu = {
  pathname: string;
  id: RibbonUtilityMenuId;
};

function RibbonDesktopSpaceNavigation({ spaces, activeSpaceId, locale, onTrackNavigation, pathname, openSpaceId, onOpenChange }: { spaces: NavigationSpace[]; activeSpaceId: NavigationSpace["id"] | null; locale: Parameters<typeof AppNavigationBlockDropdown>[0]["locale"]; onTrackNavigation: Parameters<typeof AppNavigationBlockDropdown>[0]["onTrackNavigation"]; pathname: string; openSpaceId: NavigationSpace["id"] | null; onOpenChange: (spaceId: NavigationSpace["id"], open: boolean) => void }) {
  const activeSpaceIndex = activeSpaceId === null
    ? -1
    : spaces.findIndex((space) => space.id === activeSpaceId);
  const indicatorLeft = getNavigationRibbonIndicatorLeft(activeSpaceIndex, spaces.length);
  const activeSpace = activeSpaceIndex >= 0 ? spaces[activeSpaceIndex] : null;

  return <div data-navigation-group="product" data-navigation-group-visibility="desktop" data-navigation-tutorial-target="product" className="hidden items-center justify-center xl:col-start-2 xl:flex"><nav data-navigation-ribbon data-navigation-ribbon-variant={APP_NAVIGATION_RIBBON_VARIANT} aria-label={locale === "fr" ? "Navigation par blocs" : "Block navigation"} className="flex w-[15rem] shrink-0 flex-nowrap items-center justify-center gap-0.5 rounded-full border border-white/8 bg-white/[0.05] p-px shadow-[0_18px_36px_-28px_rgba(2,6,23,0.8)] cmm-navigation-ribbon-dock">
    {indicatorLeft ? (
      <span
        aria-hidden="true"
        className="cmm-navigation-meniscus-indicator"
        style={{
          left: indicatorLeft,
        }}
      >
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${NAVIGATION_RIBBON_INDICATOR_WIDTH_PX} ${NAVIGATION_RIBBON_MENISCUS_INDICATOR_HEIGHT_PX}`}
          focusable="false"
        >
          <path
            className="cmm-navigation-meniscus-surface"
            d="M0 64V30H18C25 30 24 22 30 19C34 17 36 12 44 12C52 12 54 17 58 19C64 22 63 30 70 30H88V64Z"
          />
        </svg>
        {activeSpace ? (
          <span className="cmm-navigation-meniscus-bead">
            <span className="cmm-navigation-meniscus-bead-icon">
              <CmmIcon icon={getNavigationBlockIcon(activeSpace.id)} size="lg" />
            </span>
            <span className="cmm-navigation-meniscus-bead-label">
              {getLocalizedText(activeSpace.label, locale, activeSpace.id)}
            </span>
          </span>
        ) : null}
      </span>
    ) : null}
    {spaces.map((space) => <AppNavigationBlockDropdown key={space.id} activeSpaceId={activeSpaceId} locale={locale} onTrackNavigation={onTrackNavigation} onOpenChange={onOpenChange} open={openSpaceId === space.id} pathname={pathname} space={space} />)}
  </nav></div>;
}

function AppNavigationRibbonFrame({
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
  const [openUtilityMenu, setOpenUtilityMenu] = useState<OpenRibbonUtilityMenu | null>(null);
  const { data: hydratedIdentity } = useSWR<CurrentAccountIdentity | null>(
    authStateReady && user
      ? ["current-account-identity", user.id]
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

  const handleUtilityMenuChange = (menuId: RibbonUtilityMenuId, open: boolean) => {
    setOpenUtilityMenu((currentMenu) => {
      const currentMenuId = currentMenu?.pathname === pathname ? currentMenu.id : null;
      const nextMenuId = resolveOpenRibbonUtilityMenuId(currentMenuId, menuId, open);
      return nextMenuId ? { pathname, id: nextMenuId } : null;
    });
  };
  const openUtilityMenuId = openUtilityMenu?.pathname === pathname
    ? openUtilityMenu.id
    : null;

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
          "cmm-ribbon-frame cmm-ribbon-text border-b border-white/8 bg-transparent backdrop-blur-2xl transition-[box-shadow,border-color,background-color] duration-300 supports-[backdrop-filter]:backdrop-blur-2xl",
          isScrolled
            ? "shadow-[0_14px_40px_-18px_rgba(2,6,23,0.72)]"
            : "shadow-[0_8px_24px_-12px_rgba(2,6,23,0.56)]",
        )}
        style={ribbonChrome}
      >
        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 max-[639px]:gap-1 max-[639px]:px-2 sm:px-5 lg:gap-2 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:px-7 xl:py-2">
          <p className="sr-only">
            {locale === "fr" ? "Profil actif" : "Active profile"}: {effectiveProfileLabel}
          </p>

          <div className="order-1 col-span-2 flex min-w-0 items-center justify-between gap-2 xl:order-none xl:col-span-1 xl:col-start-1 xl:justify-start">
            <div data-navigation-group="primary" data-navigation-tutorial-target="primary" role="group" aria-label={locale === "fr" ? "Navigation principale" : "Primary navigation"} className="max-[639px]:shrink-0 cmm-navigation-group cmm-navigation-group--primary flex min-w-0 items-center gap-2">
              <Link
                href="/"
                prefetch={false}
                onClick={() => onTrackNavigation("/", "Accueil", null)}
                data-navigation-tutorial-target="home"
                className="group inline-flex min-h-12 shrink-0 items-center gap-2 rounded-[1.15rem] border border-sky-100/18 bg-gradient-to-br from-sky-500 via-blue-500 to-cyan-500 px-3.5 pr-4 text-white shadow-[0_18px_36px_-22px_rgba(37,99,235,0.92)] transition-[border-color,box-shadow,background-color] hover:border-sky-50/28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 max-[380px]:min-h-10 max-[380px]:gap-1 max-[380px]:px-2 xl:h-10 xl:min-h-0"
                aria-label="Accueil"
              >
                <BrandLogo
                  alt=""
                  className="h-9 w-9 shrink-0 object-contain max-[380px]:h-8 max-[380px]:w-8"
                  priority
                  sizes="2.25rem"
                />
                <span className="cmm-ribbon-text hidden xl:inline font-black uppercase tracking-[0.18em]">
                  Accueil
                </span>
              </Link>

              <div className="hidden min-w-0 flex-1 items-center xl:flex">
                <div className="w-10 shrink-0 2xl:w-full 2xl:max-w-[18rem]">
                  <GlobalSearch currentProfile={effectiveProfile} />
                </div>
              </div>
            </div>

            <RibbonPreferencesMenu
              locale={locale}
              ribbonChrome={ribbonChrome}
              onTrackNavigation={onTrackNavigation}
              open={openUtilityMenuId === "preferences"}
              onOpenChange={(open) => handleUtilityMenuChange("preferences", open)}
            />
          </div>

          <RibbonDesktopSpaceNavigation spaces={spaces} activeSpaceId={activeSpaceId} locale={locale} onTrackNavigation={onTrackNavigation} pathname={pathname} openSpaceId={openSpaceId} onOpenChange={(spaceId, open) => setOpenSpaceId((currentSpaceId) => resolveOpenNavigationSpaceId(currentSpaceId, spaceId, open))} />

          <div data-navigation-group="product" data-navigation-group-visibility="responsive" data-navigation-tutorial-target="product" role="group" aria-label={locale === "fr" ? "Navigation produit" : "Product navigation"} className="order-2 col-start-1 shrink-0 cmm-navigation-group cmm-navigation-group--product xl:order-none xl:hidden">
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

          <div className="order-3 col-start-2 ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2 lg:gap-2.5 xl:order-none xl:col-start-3 xl:justify-self-end">
            <RibbonFeedbackMenu
              locale={locale}
              pathname={pathname}
              ribbonChrome={ribbonChrome}
              onTrackNavigation={onTrackNavigation}
              isAuthenticated={isAuthenticated}
              isPreferencesOpen={openUtilityMenuId === "preferences"}
              open={openUtilityMenuId === "feedback"}
              onOpenChange={(open) => handleUtilityMenuChange("feedback", open)}
            />
            <div data-navigation-group="account" data-navigation-tutorial-target="account" role="group" aria-label={locale === "fr" ? "Compte et notifications" : "Account and notifications"} className="cmm-navigation-group cmm-navigation-group--account">
              <Suspense
              fallback={
                <RibbonAccountActionsFallback
                  pathname={pathname}
                  locale={locale}
                  isAuthenticated={isAuthenticated}
                  onTrackNavigation={onTrackNavigation}
                  ribbonChrome={ribbonChrome}
                  effectiveIdentity={effectiveIdentity}
                  identityForBubble={identityForBubble}
                  user={user}
                  activity={ribbonActivity}
                />
              }
              >
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
              </Suspense>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}

export function AppNavigationRibbonShell({
  currentProfile,
  profileLabel,
  identity,
  pathname,
}: AppNavigationRibbonProps & { pathname: string }) {
  const { isLoaded, user } = useUser();
  const userResource = user ?? null;

  return (
    <AppNavigationRibbonFrame
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
