"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { List, Settings2, MessageSquare } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserIdentity } from "@/lib/authz";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { AccountIdentityChip } from "@/components/account/account-identity-chip";
import { SitePreferencesControls } from "@/components/ui/site-preferences-controls";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  getActiveSpaceForPath,
  getNavigationSpacesForProfile,
  getPilotFallbackItems,
} from "@/lib/navigation";
import type { AppProfile } from "@/lib/profiles";
import { trackNavigationClick } from "@/lib/analytics/navigation-client";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./global-search";
import { useAdaptiveRibbonChrome } from "./app-navigation-ribbon-theme";
import { AppNavigationTreeMenu } from "./app-navigation-tree-menu";
import { AppNavigationBlockDropdown } from "./app-navigation-block-dropdown";
import { useDropdownPlacement } from "@/components/ui/use-dropdown-placement";
import type { DisplayMode } from "@/lib/ui/preferences";

type AppNavigationRibbonProps = {
  currentProfile: AppProfile;
  profileLabel: string;
  identity: UserIdentity | null;
};

function getDisplayModeLabel(locale: string, displayMode: DisplayMode): string {
  if (displayMode === "sobre") {
    return locale === "fr" ? "Sobre" : "Calm";
  }

  if (displayMode === "minimaliste") {
    return locale === "fr" ? "Minimaliste" : "Minimal";
  }

  return locale === "fr" ? "Exhaustif" : "Exhaustive";
}

export function AppNavigationRibbon({
  currentProfile,
  profileLabel,
  identity,
}: AppNavigationRibbonProps) {
  const pathname = usePathname();
  const { locale, displayMode } = useSitePreferences();
  const ribbonRef = useRef<HTMLElement | null>(null);
  const preferencesTriggerRef = useRef<HTMLElement | null>(null);
  const feedbackTriggerRef = useRef<HTMLElement | null>(null);
  const preferencesCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [preferencesOwnerPath, setPreferencesOwnerPath] = useState(pathname);
  const preferencesOpen = isPreferencesOpen && preferencesOwnerPath === pathname;
  const [feedbackOwnerPath, setFeedbackOwnerPath] = useState(pathname);
  const feedbackOpen = isFeedbackOpen && feedbackOwnerPath === pathname;

  const ribbonChrome = useAdaptiveRibbonChrome(
    ribbonRef,
    `${pathname}:${displayMode}:${locale}:${currentProfile}`,
  );
  const displayModeLabel = getDisplayModeLabel(locale, displayMode);

  const spaces = useMemo(() => {
    const rawSpaces = getNavigationSpacesForProfile(currentProfile, displayMode, locale);
    return rawSpaces.map((space) => ({
      ...space,
      items:
        space.id === "pilot" && space.items.length === 0
          ? getPilotFallbackItems(locale)
          : space.items,
    }));
  }, [currentProfile, displayMode, locale]);

  const activeSpaceId = getActiveSpaceForPath(currentProfile, pathname, displayMode);
  const preferencesPlacement = useDropdownPlacement({
    isOpen: preferencesOpen,
    triggerRef: preferencesTriggerRef,
    minPanelWidth: 320,
  });

  const feedbackPlacement = useDropdownPlacement({
    isOpen: feedbackOpen,
    triggerRef: feedbackTriggerRef,
    minPanelWidth: 256,
  });

  function onTrackNavigation(href: string, label: string, spaceId: string | null) {
    trackNavigationClick({
      profile: currentProfile,
      spaceId,
      href,
      label,
    });
  }

  function closeFeedbackMenu() {
    if (feedbackCloseTimerRef.current) {
      clearTimeout(feedbackCloseTimerRef.current);
      feedbackCloseTimerRef.current = null;
    }
    setIsFeedbackOpen(false);
  }

  function openPreferencesMenu() {
    if (preferencesCloseTimerRef.current) {
      clearTimeout(preferencesCloseTimerRef.current);
      preferencesCloseTimerRef.current = null;
    }
    setPreferencesOwnerPath(pathname);
    setIsPreferencesOpen(true);
  }

  function closePreferencesMenu() {
    if (preferencesCloseTimerRef.current) {
      clearTimeout(preferencesCloseTimerRef.current);
    }
    preferencesCloseTimerRef.current = setTimeout(() => {
      setIsPreferencesOpen(false);
      preferencesCloseTimerRef.current = null;
    }, 160);
  }

  function openFeedbackMenu() {
    if (feedbackCloseTimerRef.current) {
      clearTimeout(feedbackCloseTimerRef.current);
      feedbackCloseTimerRef.current = null;
    }
    setFeedbackOwnerPath(pathname);
    setIsPreferencesOpen(false);
    setIsFeedbackOpen(true);
  }

  function closeFeedbackMenuOnHover() {
    if (feedbackCloseTimerRef.current) {
      clearTimeout(feedbackCloseTimerRef.current);
    }
    feedbackCloseTimerRef.current = setTimeout(() => {
      setIsFeedbackOpen(false);
      feedbackCloseTimerRef.current = null;
    }, 160);
  }

  const feedbackLinks = [
    {
      href: "/sections/feedback#bug",
      label: "🐞 Bug",
    },
    {
      href: "/sections/feedback#improvement",
      label: "💡 Amélioration",
    },
    {
      href: "/sections/feedback#collaboration",
      label: "🤝 Collaboration",
    },
  ] as const;

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
        preferencesTriggerRef.current &&
        target &&
        !preferencesTriggerRef.current.parentElement?.contains(target)
      ) {
        setIsPreferencesOpen(false);
      }
      if (
        feedbackTriggerRef.current &&
        target &&
        !feedbackTriggerRef.current.parentElement?.contains(target)
      ) {
        setIsFeedbackOpen(false);
      }
    };

    const closeMenusOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPreferencesOpen(false);
        setIsFeedbackOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeMenusOnOutsideClick);
    document.addEventListener("keydown", closeMenusOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenusOnOutsideClick);
      document.removeEventListener("keydown", closeMenusOnEscape);
      if (preferencesCloseTimerRef.current) {
        clearTimeout(preferencesCloseTimerRef.current);
      }
      if (feedbackCloseTimerRef.current) {
        clearTimeout(feedbackCloseTimerRef.current);
      }
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
            {locale === "fr" ? "Profil actif" : "Active profile"}: {profileLabel}
          </p>

          <Link
            href="/"
            onClick={() => onTrackNavigation("/", "CleanMyMap", null)}
            className="group inline-flex min-h-12 shrink-0 items-center gap-2 rounded-[1.15rem] border border-sky-100/18 bg-gradient-to-br from-sky-500 via-blue-500 to-cyan-500 px-3.5 pr-4 text-white shadow-[0_18px_36px_-22px_rgba(37,99,235,0.92)] transition-transform hover:scale-[1.01] hover:border-sky-50/28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
            aria-label="CleanMyMap"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.9rem] border border-white/12 bg-white/12 text-[10px] font-black tracking-[0.24em]">
              CMM
            </span>
            <span className="hidden xl:inline cmm-text-caption font-black uppercase tracking-[0.18em]">
              CleanMyMap
            </span>
          </Link>

          <div className="hidden min-w-0 flex-1 items-center gap-1.5 xl:flex">
            <Link
              href="/explorer"
              onClick={() => onTrackNavigation("/explorer", locale === "fr" ? "Sommaire" : "Summary", null)}
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
                  <GlobalSearch currentProfile={currentProfile} />
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

            <details
              open={preferencesOpen}
              onToggle={(event) => {
                setPreferencesOwnerPath(pathname);
                setIsPreferencesOpen(event.currentTarget.open);
              }}
              onMouseEnter={openPreferencesMenu}
              onMouseLeave={closePreferencesMenu}
              className="relative shrink-0"
            >
              <summary
                ref={preferencesTriggerRef}
                onMouseEnter={openPreferencesMenu}
                aria-label={locale === "fr" ? "Menu des préférences d'affichage et langue" : "Display and language preferences menu"}
                aria-expanded={preferencesOpen}
                aria-controls="preferences-menu-panel"
                title={locale === "fr" ? "Réglages" : "Settings"}
                className="cmm-dropdown-trigger inline-flex h-11 w-11 list-none items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/88 transition-colors hover:border-cyan-200/32 hover:bg-white/14 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 [&::-webkit-details-marker]:hidden"
              >
                <Settings2 className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                <span className="sr-only">
                  {locale === "fr" ? "Réglages" : "Settings"}
                </span>
              </summary>

              <AnimatePresence initial={false}>
                {preferencesOpen ? (
                  <>
                    <div
                      className={cn(
                        "absolute z-50 h-3 w-full",
                        preferencesPlacement.openUp ? "bottom-full" : "top-full",
                      )}
                      onMouseEnter={openPreferencesMenu}
                      aria-hidden="true"
                    />
                    <motion.div
                      key="preferences-menu-panel"
                      id="preferences-menu-panel"
                      aria-label={locale === "fr" ? "Préférences d'affichage et langue" : "Display and language preferences"}
                      onMouseEnter={openPreferencesMenu}
                      onMouseLeave={closePreferencesMenu}
                      initial={{ opacity: 0, y: preferencesPlacement.openUp ? 8 : -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: preferencesPlacement.openUp ? 8 : -8, scale: 0.98 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className={cn(
                        "cmm-dropdown-panel absolute z-50 w-80 rounded-[1.35rem] border p-4 shadow-[0_28px_56px_-28px_rgba(2,6,23,0.82)]",
                        preferencesPlacement.openUp ? "bottom-[calc(100%+0.75rem)]" : "top-[calc(100%+0.75rem)]",
                        preferencesPlacement.alignRight ? "right-0" : "left-0",
                      )}
                      style={{
                        backgroundImage: ribbonChrome.backgroundImage,
                        borderColor: ribbonChrome.borderColor,
                      }}
                    >
                      <SitePreferencesControls />
                      <div className="mt-3 border-t border-white/10 pt-3">
                        <Link
                          href="/onboarding/localisation?next=/profil"
                          onClick={() => onTrackNavigation("/onboarding/localisation?next=/profil", locale === "fr" ? "Préférences de compte" : "Account preferences", null)}
                          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-cyan-100/14 bg-white/10 px-4 py-3 cmm-text-small font-semibold text-white/92 transition hover:border-cyan-300/40 hover:bg-white/16 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
                        >
                          {locale === "fr" ? "Préférences de compte" : "Account preferences"}
                        </Link>
                      </div>
                    </motion.div>
                  </>
                ) : null}
              </AnimatePresence>
            </details>

            <details
              open={feedbackOpen}
              onToggle={(event) => {
                setFeedbackOwnerPath(pathname);
                setIsFeedbackOpen(event.currentTarget.open);
                if (event.currentTarget.open) {
                  setIsPreferencesOpen(false);
                }
              }}
              onMouseEnter={openFeedbackMenu}
              onMouseLeave={closeFeedbackMenuOnHover}
              className="relative shrink-0"
            >
              <summary
                ref={feedbackTriggerRef}
                onMouseEnter={openFeedbackMenu}
                aria-label={locale === "fr" ? "Menu Feedback" : "Feedback menu"}
                aria-expanded={feedbackOpen}
                aria-controls="feedback-menu-panel"
                title={locale === "fr" ? "Feedback" : "Feedback"}
                className="cmm-dropdown-trigger inline-flex h-11 w-11 list-none items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/88 transition-colors hover:border-rose-200/30 hover:bg-rose-300/14 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/40 [&::-webkit-details-marker]:hidden"
              >
                <MessageSquare className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                <span className="sr-only">
                  {locale === "fr" ? "Feedback" : "Feedback"}
                </span>
              </summary>

              <AnimatePresence initial={false}>
                {feedbackOpen ? (
                  <>
                    <div
                      className={cn(
                        "absolute z-50 h-3 w-full",
                        feedbackPlacement.openUp ? "bottom-full" : "top-full",
                      )}
                      onMouseEnter={openFeedbackMenu}
                      aria-hidden="true"
                    />
                    <motion.div
                      key="feedback-menu-panel"
                      id="feedback-menu-panel"
                      aria-label={locale === "fr" ? "Options de feedback" : "Feedback options"}
                      onMouseEnter={openFeedbackMenu}
                      onMouseLeave={closeFeedbackMenuOnHover}
                      initial={{ opacity: 0, y: feedbackPlacement.openUp ? 8 : -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: feedbackPlacement.openUp ? 8 : -8, scale: 0.98 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className={cn(
                        "cmm-dropdown-panel absolute z-50 w-72 rounded-[1.25rem] border p-2 shadow-[0_28px_56px_-28px_rgba(2,6,23,0.82)]",
                        feedbackPlacement.openUp ? "bottom-[calc(100%+0.75rem)]" : "top-[calc(100%+0.75rem)]",
                        feedbackPlacement.alignRight ? "right-0" : "left-0",
                      )}
                      style={{
                        backgroundImage: ribbonChrome.backgroundImage,
                        borderColor: ribbonChrome.borderColor,
                      }}
                    >
                      <div className="space-y-1">
                        {feedbackLinks.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => {
                              onTrackNavigation(item.href, item.label, null);
                              closeFeedbackMenu();
                            }}
                            className="flex w-full items-center rounded-xl px-3 py-2.5 text-left cmm-text-small font-semibold text-white/90 transition hover:bg-white/12 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  </>
                ) : null}
              </AnimatePresence>
            </details>

            <Show when="signed-out">
              <div className="hidden items-center gap-2 md:flex">
                <SignInButton mode="modal">
                  <button 
                    aria-label={locale === "fr" ? "Se connecter à CleanMyMap" : "Sign in to CleanMyMap"}
                    className="inline-flex min-h-11 items-center justify-center rounded-full px-3 cmm-text-caption font-bold text-white/82 transition hover:text-white"
                  >
                    {locale === "fr" ? "Connexion" : "Sign in"}
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button 
                    aria-label={locale === "fr" ? "Créer un compte CleanMyMap" : "Sign up for CleanMyMap"}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-[#27C3D9] to-[#18B68F] px-4 cmm-text-caption font-bold text-[#16313b] shadow-lg shadow-cyan-900/15 transition hover:from-[#2F80C3] hover:to-[#27C3D9] active:scale-95"
                  >
                    {locale === "fr" ? "S'inscrire" : "Sign up"}
                  </button>
                </SignUpButton>
              </div>
            </Show>

            <Show when="signed-in">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="hidden lg:block">
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] p-1.5 shadow-[0_18px_36px_-30px_rgba(2,6,23,0.92)]">
                    <span className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/12 bg-white/10 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/78">
                      {locale === "fr" ? "Aperçu local" : "Local preview"}
                    </span>
                    <span className="inline-flex min-h-10 items-center justify-center rounded-full border border-cyan-100/12 bg-cyan-400/12 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50">
                      {displayModeLabel}
                    </span>
                    <div className="rounded-full border border-white/10 bg-white/8 px-1.5 py-1">
                      {identity ? <AccountIdentityChip identity={identity} /> : null}
                    </div>
                  </div>
                </div>
                <NotificationBell />
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/14 bg-white/10 shadow-[0_16px_32px_-26px_rgba(2,6,23,0.9)]">
                  <UserButton
                    appearance={{
                      elements: {
                        userButtonAvatarBox: "h-9 w-9 ring-2 ring-emerald-500/20 shadow-lg",
                      },
                    }}
                  />
                </div>
              </div>
            </Show>
          </div>
        </div>
      </nav>
    </div>
  );
}
