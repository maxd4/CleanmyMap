"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bug,
  ChevronDown,
  Lightbulb,
  MessageSquare,
  Settings2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { CmmButton } from "@/components/ui/cmm-button";
import { SitePreferencesControls } from "@/components/ui/site-preferences-controls";
import { useDropdownPlacement } from "@/components/ui/use-dropdown-placement";
import { buildOnboardingLocalisationHref, PROFIL_ROUTE } from "@/lib/accueil-pilotage-routes";
import type { Locale } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";

import type { RibbonNavigationTracker } from "./app-navigation-ribbon-account";
import type { RibbonChrome } from "./app-navigation-ribbon-theme";

export function RibbonMenus({
  locale,
  pathname,
  ribbonChrome,
  onTrackNavigation,
}: {
  locale: Locale;
  pathname: string;
  ribbonChrome: RibbonChrome;
  onTrackNavigation: RibbonNavigationTracker;
}) {
  const preferencesTriggerRef = useRef<HTMLElement | null>(null);
  const feedbackTriggerRef = useRef<HTMLElement | null>(null);
  const preferencesCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [preferencesOwnerPath, setPreferencesOwnerPath] = useState(pathname);
  const preferencesOpen = isPreferencesOpen && preferencesOwnerPath === pathname;
  const [feedbackOwnerPath, setFeedbackOwnerPath] = useState(pathname);
  const feedbackOpen = isFeedbackOpen && feedbackOwnerPath === pathname;

  const preferencesPlacement = useDropdownPlacement({
    isOpen: preferencesOpen,
    triggerRef: preferencesTriggerRef,
  });

  const feedbackPlacement = useDropdownPlacement({
    isOpen: feedbackOpen,
    triggerRef: feedbackTriggerRef,
  });
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
      label: "Signaler un problème technique",
      icon: Bug,
      iconClassName: "text-rose-300",
    },
    {
      href: "/sections/feedback#improvement",
      label: "Proposer une idée ou suggestion",
      icon: Lightbulb,
      iconClassName: "text-amber-300",
    },
    {
      href: "/sections/feedback#collaboration",
      label: "Nous contacter pour travailler ensemble",
      icon: UsersRound,
      iconClassName: "text-emerald-300",
    },
  ] as const;

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
    <>
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
                className="cmm-dropdown-trigger inline-flex h-11 min-w-11 list-none items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-0 text-white transition-colors hover:border-cyan-200/32 hover:bg-white/14 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 sm:w-auto sm:px-3 [&::-webkit-details-marker]:hidden"
              >
                <Settings2 className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                <span className="hidden text-sm font-semibold sm:inline">
                  {locale === "fr" ? "Préférences" : "Preferences"}
                </span>
                <ChevronDown className="hidden h-4 w-4 shrink-0 text-slate-300 sm:inline" aria-hidden="true" />
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
                      initial={{ opacity: 0, y: preferencesPlacement.openUp ? 8 : -8, scale: 0.98, x: "-50%" }}
                      animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                      exit={{ opacity: 0, y: preferencesPlacement.openUp ? 8 : -8, scale: 0.98, x: "-50%" }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className={cn(
                        "cmm-dropdown-panel absolute z-50 w-[min(36rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] rounded-2xl border border-white/15 bg-slate-950/95 p-4 text-white shadow-[0_28px_56px_-28px_rgba(2,6,23,0.82)] max-sm:w-[calc(100vw-1.5rem)]",
                        preferencesPlacement.openUp ? "bottom-[calc(100%+0.75rem)]" : "top-[calc(100%+0.75rem)]",
                        "left-1/2 -translate-x-1/2",
                      )}
                      style={{
                        backgroundImage: ribbonChrome.backgroundImage,
                        backgroundColor: ribbonChrome.backgroundColor,
                        borderColor: ribbonChrome.borderColor,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none absolute h-4 w-4 rotate-45 border-l border-t border-white/15",
                          preferencesPlacement.openUp ? "-bottom-2 rotate-[225deg] border-b border-l-0 border-r border-t-0" : "-top-2",
                          "left-1/2 right-auto -translate-x-1/2",
                        )}
                        style={{
                          backgroundImage: ribbonChrome.backgroundImage,
                          backgroundColor: ribbonChrome.backgroundColor,
                          borderColor: ribbonChrome.borderColor,
                        }}
                      />
                      <SitePreferencesControls />
                      <div className="mt-4 border-t border-white/12 pt-4">
                        <CmmButton
                          asChild
                          tone="primary"
                          size="md"
                          className="w-full justify-center rounded-xl text-sm font-bold"
                        >
                          <Link
                            href={buildOnboardingLocalisationHref(PROFIL_ROUTE)}
                            prefetch={false}
                            onClick={() =>
                              onTrackNavigation(
                                buildOnboardingLocalisationHref(PROFIL_ROUTE),
                                locale === "fr"
                                  ? "Préférences de compte"
                                  : "Account preferences",
                                null,
                              )
                            }
                          >
                            {locale === "fr"
                              ? "Préférences de compte"
                              : "Account preferences"}
                          </Link>
                        </CmmButton>
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
              className="relative shrink-0 max-[380px]:hidden"
            >
              <summary
                ref={feedbackTriggerRef}
                onMouseEnter={openFeedbackMenu}
                aria-label={locale === "fr" ? "Menu Feedback" : "Feedback menu"}
                aria-expanded={feedbackOpen}
                aria-controls="feedback-menu-panel"
                title={locale === "fr" ? "Feedback" : "Feedback"}
                className="cmm-dropdown-trigger inline-flex h-11 min-w-11 list-none items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-0 text-white transition-colors hover:border-rose-200/30 hover:bg-rose-300/14 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/40 sm:w-auto sm:px-3 [&::-webkit-details-marker]:hidden"
              >
                <MessageSquare className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                <span className="hidden text-sm font-semibold sm:inline">
                  Feedback
                </span>
                <ChevronDown className="hidden h-4 w-4 shrink-0 text-slate-300 sm:inline" aria-hidden="true" />
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
                      initial={{ opacity: 0, y: feedbackPlacement.openUp ? 8 : -8, scale: 0.98, x: "-50%" }}
                      animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                      exit={{ opacity: 0, y: feedbackPlacement.openUp ? 8 : -8, scale: 0.98, x: "-50%" }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className={cn(
                        "cmm-dropdown-panel absolute z-50 w-[min(34rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] rounded-2xl border border-white/15 bg-slate-950/95 p-2 text-white shadow-[0_28px_56px_-28px_rgba(2,6,23,0.82)] max-sm:w-[calc(100vw-1.5rem)]",
                        feedbackPlacement.openUp ? "bottom-[calc(100%+0.75rem)]" : "top-[calc(100%+0.75rem)]",
                        "left-1/2 -translate-x-1/2",
                      )}
                      style={{
                        backgroundImage: ribbonChrome.backgroundImage,
                        backgroundColor: ribbonChrome.backgroundColor,
                        borderColor: ribbonChrome.borderColor,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none absolute h-4 w-4 rotate-45 border-l border-t border-white/15",
                          feedbackPlacement.openUp ? "-bottom-2 rotate-[225deg] border-b border-l-0 border-r border-t-0" : "-top-2",
                          "left-1/2 right-auto -translate-x-1/2",
                        )}
                        style={{
                          backgroundImage: ribbonChrome.backgroundImage,
                          backgroundColor: ribbonChrome.backgroundColor,
                          borderColor: ribbonChrome.borderColor,
                        }}
                      />
                      <div className="divide-y divide-white/12">
                        {feedbackLinks.map((item) => (
                          <CmmButton
                            key={item.href}
                            asChild
                            tone="tertiary"
                            className="group w-full justify-start gap-3 rounded-xl border-0 px-3.5 py-4 text-left text-white hover:border-transparent hover:bg-white/10 hover:text-white"
                          >
                            <Link
                              href={item.href}
                              prefetch={false}
                              onClick={() => {
                                onTrackNavigation(item.href, item.label, null);
                                closeFeedbackMenu();
                              }}
                            >
                              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/[0.06] ${item.iconClassName}`}>
                                <item.icon className="h-5 w-5" aria-hidden="true" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold text-white">{item.label}</span>
                              </span>
                              <span className="text-lg leading-none text-slate-300 transition-transform group-hover:translate-x-0.5" aria-hidden="true">›</span>
                            </Link>
                          </CmmButton>
                        ))}
                      </div>
                    </motion.div>
                  </>
                ) : null}
              </AnimatePresence>
            </details>
    </>
  );
}
