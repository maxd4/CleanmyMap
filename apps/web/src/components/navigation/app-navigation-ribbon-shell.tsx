"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { List } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

import type { UserIdentity } from "@/lib/authz";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  getActiveSpaceForPath,
  getNavigationSpacesForProfile,
} from "@/lib/navigation";
import { getProfileLabel } from "@/lib/profiles";
import { trackNavigationClick } from "@/lib/analytics/navigation-client";
import { cn } from "@/lib/utils";
import { EXPLORER_ROUTE } from "@/lib/accueil-pilotage-routes";
import { GlobalSearch } from "./global-search";
import { useAdaptiveRibbonChrome } from "./app-navigation-ribbon-theme";
import { AppNavigationBlockDropdown } from "./app-navigation-block-dropdown";
import { AppNavigationTreeMenu } from "./app-navigation-tree-menu";
import {
  RibbonAccountActions,
  type AppNavigationRibbonProps,
  type ClerkUserLike,
} from "./app-navigation-ribbon-account";
import { useRibbonActivityStatus } from "./app-navigation-ribbon-activity";
import { RibbonMenus } from "./app-navigation-ribbon-menus";

type AppNavigationRibbonShellProps = AppNavigationRibbonProps & {
  pathname: string;
  user: ClerkUserLike | null;
  showAccountActions: boolean;
};

function AppNavigationRibbonShell({
  currentProfile,
  profileLabel,
  identity,
  pathname,
  user,
  showAccountActions,
}: AppNavigationRibbonShellProps) {
  const { locale, displayMode } = useSitePreferences();
  const ribbonRef = useRef<HTMLElement | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const effectiveProfile = identity?.activeProfile ?? currentProfile ?? "benevole";
  const effectiveProfileLabel =
    profileLabel ?? getProfileLabel(effectiveProfile, locale);
  const effectiveIdentity: UserIdentity | null = identity ?? null;

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
  const isAuthenticated = showAccountActions && Boolean(effectiveIdentity);
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
    <div className="sticky top-[var(--app-ribbon-top-offset,0rem)] z-50 w-full">
      <nav
        ref={ribbonRef}
        aria-label={locale === "fr" ? "Barre de navigation principale" : "Main navigation bar"}
        className={cn(
          "w-full border-b border-white/8 bg-transparent backdrop-blur-2xl transition-all duration-300 supports-[backdrop-filter]:backdrop-blur-2xl",
          isScrolled
            ? "shadow-[0_14px_40px_-18px_rgba(2,6,23,0.72)]"
            : "shadow-[0_8px_24px_-12px_rgba(2,6,23,0.56)]",
        )}
        style={ribbonChrome}
      >
        <div className="flex w-full min-w-0 items-center gap-2 px-3 py-2.5 sm:px-5 lg:gap-2 xl:px-7 xl:py-3">
          <p className="sr-only">
            {locale === "fr" ? "Profil actif" : "Active profile"}: {effectiveProfileLabel}
          </p>

          <Link
            href="/"
            prefetch={false}
            onClick={() => onTrackNavigation("/", "Accueil", null)}
            className="group inline-flex min-h-12 shrink-0 items-center gap-2 rounded-[1.15rem] border border-sky-100/18 bg-gradient-to-br from-sky-500 via-blue-500 to-cyan-500 px-3.5 pr-4 text-white shadow-[0_18px_36px_-22px_rgba(37,99,235,0.92)] transition-transform hover:scale-[1.01] hover:border-sky-50/28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
            aria-label="Accueil"
          >
            <span
              aria-hidden="true"
              data-site-logo-slot
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.9rem] border border-white/12 bg-white/12"
            />
            <span className="hidden xl:inline cmm-text-caption font-black uppercase tracking-[0.18em]">
              Accueil
            </span>
          </Link>

          <div className="hidden min-w-0 flex-1 items-center gap-1.5 xl:flex">
          <Link
            href={EXPLORER_ROUTE}
            prefetch={false}
            onClick={() => onTrackNavigation(EXPLORER_ROUTE, locale === "fr" ? "Sommaire" : "Summary", null)}
            className="group inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-cyan-100/16 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 px-4 text-white shadow-[0_18px_36px_-22px_rgba(20,184,166,0.58)] transition-transform hover:scale-[1.01] hover:border-cyan-100/28 hover:from-cyan-400 hover:via-teal-400 hover:to-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
            aria-label={locale === "fr" ? "Sommaire" : "Summary"}
          >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/16 bg-white/14">
                <List className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="cmm-text-caption font-black uppercase tracking-[0.18em]">
                {locale === "fr" ? "Sommaire" : "Summary"}
              </span>
            </Link>

            <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
              <nav
                aria-label={locale === "fr" ? "Navigation par blocs" : "Block navigation"}
                className="flex shrink-0 flex-nowrap items-center gap-0.5 rounded-full border border-white/8 bg-white/[0.05] p-1 shadow-[0_18px_36px_-28px_rgba(2,6,23,0.8)]"
              >
                {spaces.map((space) => (
                  <AppNavigationBlockDropdown
                    key={space.id}
                    activeSpaceId={activeSpaceId}
                    locale={locale}
                    onTrackNavigation={onTrackNavigation}
                    pathname={pathname}
                    ribbonChrome={ribbonChrome}
                    space={space}
                  />
                ))}
              </nav>

              <div className="flex min-w-0 flex-1 justify-center">
              <div className="w-full max-w-[24rem] xl:max-w-[26rem]">
                  <GlobalSearch currentProfile={effectiveProfile} />
                </div>
              </div>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-2.5">
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
              locale={locale}
              pathname={pathname}
              ribbonChrome={ribbonChrome}
              onTrackNavigation={onTrackNavigation}
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
  const { user } = useUser();
  const userResource = user ?? null;

  return (
    <AppNavigationRibbonShell
      currentProfile={currentProfile}
      profileLabel={profileLabel}
      identity={identity}
      pathname={pathname}
      user={userResource}
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
  const { user } = useUser();
  const userResource = user ?? null;

  return (
    <AppNavigationRibbonShell
      currentProfile={currentProfile}
      profileLabel={profileLabel}
      identity={identity}
      pathname={pathname}
      user={userResource}
      showAccountActions
    />
  );
}
