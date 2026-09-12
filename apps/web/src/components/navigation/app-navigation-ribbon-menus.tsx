"use client";

import { useState } from "react";
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
import { CmmDropdown } from "@/components/ui/cmm-dropdown";
import { SitePreferencesControls } from "@/components/ui/site-preferences-controls";
import { buildOnboardingLocalisationHref, PROFIL_ROUTE } from "@/lib/accueil-pilotage-routes";
import type { Locale } from "@/lib/ui/preferences";
import { RibbonDropdownItem } from "./ribbon-dropdown-item";

import type { RibbonNavigationTracker } from "./app-navigation-ribbon-account";
import type { RibbonChrome } from "./app-navigation-ribbon-theme";

export function RibbonMenus({
  locale,
  ribbonChrome,
  onTrackNavigation,
}: {
  locale: Locale;
  ribbonChrome: RibbonChrome;
  onTrackNavigation: RibbonNavigationTracker;
}) {
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

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

  return (
    <>
      <CmmDropdown
        id="preferences-menu-panel"
        ariaLabel={locale === "fr" ? "Préférences d'affichage et langue" : "Display and language preferences"}
        open={isPreferencesOpen}
        onOpenChange={(open) => {
          setIsPreferencesOpen(open);
          if (open) {
            setIsFeedbackOpen(false);
          }
        }}
        wrapperClassName="shrink-0"
        panelClassName="cmm-dropdown-panel w-[min(20rem,calc(100vw-1rem))] rounded-2xl border border-white/15 bg-slate-950/95 p-2.5 text-white shadow-[0_20px_40px_-24px_rgba(2,6,23,0.76)]"
        panelStyle={{
          backgroundImage: ribbonChrome.backgroundImage,
          backgroundColor: ribbonChrome.backgroundColor,
          borderColor: ribbonChrome.borderColor,
        }}
        renderTrigger={(triggerProps) => (
          <button
            {...triggerProps}
            aria-label={locale === "fr" ? "Menu des préférences d'affichage et langue" : "Display and language preferences menu"}
            className="cmm-dropdown-trigger inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-0 text-white transition-colors hover:border-cyan-200/32 hover:bg-white/14 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 sm:w-auto sm:px-3"
          >
            <Settings2 className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            <span className="hidden text-sm font-semibold sm:inline">
              {locale === "fr" ? "Préférences" : "Preferences"}
            </span>
            <ChevronDown className="hidden h-4 w-4 shrink-0 text-slate-300 sm:inline" aria-hidden="true" />
          </button>
        )}
      >
        <SitePreferencesControls variant="compact" />
        <div className="mt-3 border-t border-white/12 pt-3">
          <CmmButton
            asChild
            tone="primary"
            size="sm"
            className="w-full justify-center rounded-xl text-sm font-bold"
          >
            <Link
              href={buildOnboardingLocalisationHref(PROFIL_ROUTE)}
              prefetch={false}
              onClick={() =>
                onTrackNavigation(
                  buildOnboardingLocalisationHref(PROFIL_ROUTE),
                  locale === "fr" ? "Préférences de compte" : "Account preferences",
                  null,
                )
              }
            >
              {locale === "fr" ? "Préférences de compte" : "Account preferences"}
            </Link>
          </CmmButton>
        </div>
      </CmmDropdown>

      <CmmDropdown
        id="feedback-menu-panel"
        ariaLabel={locale === "fr" ? "Options de feedback" : "Feedback options"}
        open={isFeedbackOpen}
        onOpenChange={(open) => {
          setIsFeedbackOpen(open);
          if (open) {
            setIsPreferencesOpen(false);
          }
        }}
        wrapperClassName="shrink-0 max-[380px]:hidden"
        panelClassName="cmm-dropdown-panel w-[min(18rem,calc(100vw-1rem))] rounded-2xl border border-white/15 bg-slate-950/95 p-1.5 text-white shadow-[0_20px_40px_-24px_rgba(2,6,23,0.76)]"
        panelStyle={{
          backgroundImage: ribbonChrome.backgroundImage,
          backgroundColor: ribbonChrome.backgroundColor,
          borderColor: ribbonChrome.borderColor,
        }}
        renderTrigger={(triggerProps) => (
          <button
            {...triggerProps}
            aria-label={locale === "fr" ? "Menu Feedback" : "Feedback menu"}
            className="cmm-dropdown-trigger inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-0 text-white transition-colors hover:border-rose-200/30 hover:bg-rose-300/14 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/40 sm:w-auto sm:px-3"
          >
            <MessageSquare className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            <span className="hidden text-sm font-semibold sm:inline">Feedback</span>
            <ChevronDown className="hidden h-4 w-4 shrink-0 text-slate-300 sm:inline" aria-hidden="true" />
          </button>
        )}
      >
        <div className="divide-y divide-white/12">
          {feedbackLinks.map((item) => (
            <RibbonDropdownItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              iconClassName={item.iconClassName}
              compact
              onClick={() => onTrackNavigation(item.href, item.label, null)}
            />
          ))}
        </div>
      </CmmDropdown>
    </>
  );
}
