"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Settings2, ChevronDown, MessageSquare } from "lucide-react";
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
import { useDropdownPlacement } from "@/components/ui/use-dropdown-placement";

type AppNavigationRibbonProps = {
  currentProfile: AppProfile;
  profileLabel: string;
  identity: UserIdentity | null;
};

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
    setIsFeedbackOpen(false);
  }

  function openPreferencesMenu() {
    setPreferencesOwnerPath(pathname);
    setIsPreferencesOpen(true);
  }

  function closePreferencesMenu() {
    setIsPreferencesOpen(false);
  }

  function openFeedbackMenu() {
    setFeedbackOwnerPath(pathname);
    setIsPreferencesOpen(false);
    setIsFeedbackOpen(true);
  }

  function closeFeedbackMenuOnHover() {
    setIsFeedbackOpen(false);
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
    };
  }, []);

  return (
    <div className="sticky top-[var(--app-ribbon-top-offset,0rem)] z-50 mx-auto w-full max-w-[1800px] px-2 sm:px-4 xl:px-6">
      <nav
        ref={ribbonRef}
        aria-label={locale === "fr" ? "Barre de navigation principale" : "Main navigation bar"}
        className={cn(
          "w-full overflow-visible rounded-[2rem] border bg-[color:var(--bg-elevated)] transition-all duration-300",
          isScrolled
            ? "shadow-[0_28px_56px_-28px_rgba(2,6,23,0.82)]"
            : "shadow-[0_20px_40px_-28px_rgba(2,6,23,0.7)]",
        )}
        style={ribbonChrome}
      >
        <div className="flex min-w-0 items-center gap-2 px-3 py-3 sm:px-4 lg:gap-3 xl:px-5">
          <p className="sr-only">
            {locale === "fr" ? "Profil actif" : "Active profile"}: {profileLabel}
          </p>

          <Link
            href="/"
            onClick={() => onTrackNavigation("/", "CleanMyMap", null)}
            className="group inline-flex min-h-11 shrink-0 items-center justify-center rounded-[1.05rem] border border-sky-200/20 bg-gradient-to-br from-sky-500 via-blue-500 to-cyan-500 px-3 text-white shadow-[0_18px_36px_-20px_rgba(37,99,235,0.85)] transition-transform hover:scale-[1.02] hover:border-sky-100/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
            aria-label="CleanMyMap"
          >
            <span className="cmm-text-caption font-black uppercase tracking-[0.24em]">
              CMM
            </span>
          </Link>

          <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
            <AppNavigationTreeMenu
              key={`desktop-tree-${pathname}`}
              activeSpaceId={activeSpaceId}
              idBase="desktop-navigation-tree"
              locale={locale}
              onTrackNavigation={onTrackNavigation}
              pathname={pathname}
              ribbonChrome={ribbonChrome}
              spaces={spaces}
            />
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

            <GlobalSearch currentProfile={currentProfile} />

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
                className="cmm-dropdown-trigger inline-flex min-h-11 list-none items-center justify-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 text-white/82 transition-colors hover:border-cyan-300/40 hover:bg-white/16 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 xl:px-4 [&::-webkit-details-marker]:hidden"
              >
                <Settings2 className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                <span className="hidden xl:inline cmm-text-caption font-bold uppercase tracking-[0.14em]">
                  {locale === "fr" ? "Réglages" : "Settings"}
                </span>
                <ChevronDown
                  className={cn(
                    "hidden h-4 w-4 shrink-0 transition-transform duration-150 xl:inline",
                    preferencesOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </summary>

              <AnimatePresence initial={false}>
                {preferencesOpen ? (
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
                      "cmm-dropdown-panel absolute z-50 w-80 rounded-[1.5rem] border p-4 shadow-[0_28px_56px_-28px_rgba(2,6,23,0.82)]",
                      preferencesPlacement.openUp ? "bottom-full mb-3" : "top-full mt-3",
                      preferencesPlacement.alignRight ? "right-0" : "left-0",
                    )}
                    style={{
                      backgroundImage: ribbonChrome.backgroundImage,
                      borderColor: ribbonChrome.borderColor,
                    }}
                  >
                    <SitePreferencesControls />
                  </motion.div>
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
                className="cmm-dropdown-trigger inline-flex min-h-11 list-none items-center justify-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 text-white/82 transition-colors hover:border-cyan-300/40 hover:bg-white/16 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 xl:px-4 [&::-webkit-details-marker]:hidden"
              >
                <MessageSquare className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                <span className="hidden xl:inline cmm-text-caption font-bold uppercase tracking-[0.14em]">
                  Feedback
                </span>
                <ChevronDown
                  className={cn(
                    "hidden h-4 w-4 shrink-0 transition-transform duration-150 xl:inline",
                    feedbackOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </summary>

              <AnimatePresence initial={false}>
                {feedbackOpen ? (
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
                      feedbackPlacement.openUp ? "bottom-full mb-3" : "top-full mt-3",
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
                          className="flex w-full items-center rounded-xl px-3 py-2.5 text-left cmm-text-small font-semibold text-white/86 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </details>

            <Show when="signed-out">
              <div className="hidden items-center gap-2 md:flex">
                <SignInButton mode="modal">
                  <button className="inline-flex min-h-11 items-center justify-center rounded-full px-3 cmm-text-caption font-bold text-white/82 transition hover:text-white">
                    {locale === "fr" ? "Connexion" : "Sign in"}
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-[#27C3D9] to-[#18B68F] px-4 cmm-text-caption font-bold text-[#16313b] shadow-lg shadow-cyan-900/15 transition hover:from-[#2F80C3] hover:to-[#27C3D9] active:scale-95">
                    {locale === "fr" ? "S'inscrire" : "Sign up"}
                  </button>
                </SignUpButton>
              </div>
            </Show>

            <Show when="signed-in">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="hidden lg:block">
                  {identity ? <AccountIdentityChip identity={identity} /> : null}
                </div>
                <NotificationBell />
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/14 bg-white/10">
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
