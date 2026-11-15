"use client";

import {
  Bug,
  ChevronDown,
  HandCoins,
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
import { cn } from "@/lib/utils";
import { FeedbackDiscoveryCallout } from "./feedback-discovery-callout";
import { RibbonDropdownItem } from "./ribbon-dropdown-item";

import type { RibbonNavigationTracker } from "./app-navigation-ribbon-account";
import type { RibbonChrome } from "./app-navigation-ribbon-theme";

type RibbonMenusProps = {
  locale: Locale;
  pathname: string;
  ribbonChrome: RibbonChrome;
  onTrackNavigation: RibbonNavigationTracker;
  isAuthenticated: boolean;
};

export type RibbonMenuOpenProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const FEEDBACK_LINKS = [
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
    label: "Nous contacter",
    icon: UsersRound,
    iconClassName: "text-emerald-300",
  },
  {
    href: "/sections/funding",
    label: "Soutenir CleanMyMap",
    icon: HandCoins,
    iconClassName: "text-cyan-300",
  },
] as const;

export function RibbonPreferencesMenu({
  locale,
  ribbonChrome,
  onTrackNavigation,
  onOpenChange,
  open,
}: Pick<RibbonMenusProps, "locale" | "ribbonChrome" | "onTrackNavigation"> & RibbonMenuOpenProps) {
  return (
    <div data-navigation-utility-menu="preferences" className="cmm-navigation-group cmm-navigation-group--preferences shrink-0">
      <CmmDropdown
        id="preferences-menu-panel"
        ariaLabel={locale === "fr" ? "Préférences d'affichage et langue" : "Display and language preferences"}
        open={open}
        onOpenChange={onOpenChange}
        wrapperClassName="shrink-0"
        panelClassName="cmm-dropdown-panel w-[min(20rem,calc(100vw-1rem))] rounded-2xl border border-white/15 bg-slate-950/95 p-2.5 text-white shadow-[0_20px_40px_-24px_rgba(2,6,23,0.76)]"
        panelStyle={{ backgroundImage: ribbonChrome.backgroundImage, backgroundColor: ribbonChrome.backgroundColor, borderColor: ribbonChrome.borderColor }}
        renderTrigger={(triggerProps) => (
          <button {...triggerProps} data-navigation-tutorial-target="preferences" aria-label={locale === "fr" ? "Menu des préférences d'affichage et langue" : "Display and language preferences"} className="cmm-dropdown-trigger inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-0 text-white transition-colors hover:border-cyan-200/32 hover:bg-white/14 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 max-[380px]:h-10 max-[380px]:min-w-10 xl:w-auto xl:px-3 xl:h-10">
            <Settings2 className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            <span className="cmm-ribbon-text hidden font-semibold min-[1440px]:inline">{locale === "fr" ? "Préférences" : "Preferences"}</span>
            <ChevronDown className="hidden h-4 w-4 shrink-0 text-slate-300 min-[1440px]:inline" aria-hidden="true" />
          </button>
        )}
      >
        <SitePreferencesControls variant="compact" />
        <div className="mt-3 border-t border-white/12 pt-3">
          <CmmButton asChild tone="primary" size="sm" className="w-full justify-center rounded-xl text-sm font-bold">
            <Link href={buildOnboardingLocalisationHref(PROFIL_ROUTE)} prefetch={false} onClick={() => onTrackNavigation(buildOnboardingLocalisationHref(PROFIL_ROUTE), locale === "fr" ? "Préférences de compte" : "Account preferences", null)}>
              {locale === "fr" ? "Préférences de compte" : "Account preferences"}
            </Link>
          </CmmButton>
        </div>
      </CmmDropdown>
    </div>
  );
}

export function RibbonFeedbackMenu({
  locale,
  pathname,
  ribbonChrome,
  onTrackNavigation,
  isAuthenticated,
  isPreferencesOpen,
  onOpenChange,
  open,
}: RibbonMenusProps & RibbonMenuOpenProps & {
  isPreferencesOpen: boolean;
}) {
  return (
    <div data-navigation-utility-menu="feedback" className="cmm-navigation-group cmm-navigation-group--feedback relative shrink-0">
      <CmmDropdown
        id="feedback-menu-panel"
        ariaLabel={locale === "fr" ? "Options de feedback" : "Feedback options"}
        open={open}
        onOpenChange={onOpenChange}
        wrapperClassName="shrink-0"
        panelClassName="cmm-dropdown-panel w-[min(17rem,calc(100vw-1rem))] rounded-2xl border border-white/15 bg-slate-950/95 p-1 text-white shadow-[0_16px_32px_-22px_rgba(2,6,23,0.72)]"
        panelStyle={{ backgroundImage: ribbonChrome.backgroundImage, backgroundColor: ribbonChrome.backgroundColor, borderColor: ribbonChrome.borderColor }}
        renderTrigger={(triggerProps) => (
          <button {...triggerProps} data-navigation-tutorial-target="feedback" aria-label={locale === "fr" ? "Menu Feedback" : "Feedback menu"} data-cmm-button-tone="critical" data-cmm-button-size="md" data-cmm-button-variant="pill" data-cmm-button-width="auto" className={cn("cmm-button cmm-dropdown-trigger inline-flex h-11 min-w-11 items-center justify-center gap-2 px-0 text-white max-[380px]:h-10 max-[380px]:min-w-10 xl:h-10 xl:w-auto xl:px-3", open && "ring-2 ring-amber-200/80 ring-offset-2 ring-offset-slate-950")}>
            <MessageSquare className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            <span className="cmm-ribbon-text hidden font-semibold min-[1440px]:inline">Feedback</span>
            <ChevronDown className="hidden h-4 w-4 shrink-0 text-white/80 min-[1440px]:inline" aria-hidden="true" />
          </button>
        )}
      >
        <div className="divide-y divide-white/12">
          {FEEDBACK_LINKS.map((item) => (
            <RibbonDropdownItem key={item.href} href={item.href} label={item.label} icon={item.icon} iconClassName={item.iconClassName} compact onClick={() => { onOpenChange(false); onTrackNavigation(item.href, item.label, null); }} />
          ))}
        </div>
      </CmmDropdown>
      <FeedbackDiscoveryCallout isAuthenticated={isAuthenticated} isMenuOpen={open} isPreferencesOpen={isPreferencesOpen} pathname={pathname} />
    </div>
  );
}
