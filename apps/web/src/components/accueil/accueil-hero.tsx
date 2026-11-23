"use client";

import {
  ArrowRight,
  Plus,
  UserRound,
  Users,
  MapPin,
} from "lucide-react";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type {
  HomeImpactSnapshot,
} from "@/lib/accueil/config";
import type { PublicImpactMetric } from "@/lib/impact/public-impact-kpis";
import type { Locale } from "@/lib/ui/preferences";
import { HomeImpactKpiCard } from "./accueil-impact-kpi-card";
import { HomeMapPreview } from "./accueil-map-preview";
import { RibbonTutorial } from "@/components/navigation/app-navigation-ribbon-tour";

interface HomeHeroProps {
  metrics: PublicImpactMetric[];
  impactSnapshot: HomeImpactSnapshot | null;
}

const heroActions = [
  {
    id: "map",
    href: "/actions/map",
    icon: MapPin,
    tone: "primary",
    width: "auto",
    showArrow: true,
  },
  {
    id: "signIn",
    href: "/sign-in",
    icon: Users,
    tone: "critical",
    width: "auto",
    showArrow: false,
  },
  {
    id: "join",
    href: "/sections/rejoindre-une-action",
    icon: UserRound,
    tone: "secondary",
    width: "auto",
    showArrow: false,
  },
  {
    id: "create",
    href: "/actions/new",
    icon: Plus,
    tone: "secondary",
    width: "auto",
    showArrow: false,
  },
] as const;

const HOME_BRAND_SLOGAN = "Agir · Cartographier · Impacter · Sensibiliser";

const HOME_HERO_COPY: Record<Locale, {
  eyebrow: string;
  brandSlogan: string;
  impactTitle: string;
  methodology: string;
  snapshotUnavailable: string;
  snapshotGenerated: (date: string) => string;
  snapshotUpdate: string;
  actions: Record<(typeof heroActions)[number]["id"], string>;
  localeSwitcherLabel: string;
  localeLabels: Record<Locale, string>;
}> = {
  fr: {
    eyebrow: "Des territoires plus propres, ensemble",
    brandSlogan: HOME_BRAND_SLOGAN,
    impactTitle: "Impact terrain 2026",
    methodology: "Méthodologie",
    snapshotUnavailable: "Données d’impact indisponibles.",
    snapshotGenerated: (date) => `Dernières données générées le ${date}.`,
    snapshotUpdate: "Mise à jour mensuelle le 1er du mois.",
    actions: {
      map: "Consulter la carte",
      signIn: "Se connecter / S'inscrire",
      join: "Rejoindre une action",
      create: "Créer une action",
    },
    localeSwitcherLabel: "Choisir la langue",
    localeLabels: { fr: "Français", en: "Anglais" },
  },
  en: {
    eyebrow: "Cleaner places, together",
    brandSlogan: HOME_BRAND_SLOGAN,
    impactTitle: "Field impact 2026",
    methodology: "Methodology",
    snapshotUnavailable: "Impact data is currently unavailable.",
    snapshotGenerated: (date) => `Latest data generated on ${date}.`,
    snapshotUpdate: "Updated monthly on the 1st.",
    actions: {
      map: "View the map",
      signIn: "Sign in / Sign up",
      join: "Join an action",
      create: "Create an action",
    },
    localeSwitcherLabel: "Choose language",
    localeLabels: { fr: "French", en: "English" },
  },
};

function HomeHeroLocaleSwitcher({ locale, setLocale }: { locale: Locale; setLocale: (nextLocale: Locale) => void }) {
  const copy = HOME_HERO_COPY[locale];

  return (
    <div
      data-homepage-locale-switcher
      role="group"
      aria-label={copy.localeSwitcherLabel}
      className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-full border border-white/70 bg-white px-1 py-1 text-xs font-black shadow-[0_8px_18px_-12px_rgba(0,40,30,0.8)]"
    >
      {(["fr", "en"] as const).map((option) => {
        const isActive = locale === option;
        return (
          <button
            key={option}
            type="button"
            aria-label={copy.localeLabels[option]}
            aria-pressed={isActive}
            onClick={() => setLocale(option)}
            className={`min-h-8 rounded-full px-2.5 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-primary-bg)] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${isActive ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-text)]" : "text-[var(--action-primary-bg)] hover:bg-emerald-50"}`}
          >
            {option.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

export function HomeHero({
  metrics,
  impactSnapshot,
}: HomeHeroProps) {
  const { locale, setLocale } = useSitePreferences();
  const copy = HOME_HERO_COPY[locale];
  const snapshotDateLabel = impactSnapshot?.generatedAt
    ? new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(impactSnapshot.generatedAt))
    : null;

  return (
    <section data-homepage-section="hero" className="relative isolate overflow-visible text-[#082f24]">
      <div className="cmm-page-width relative z-10 px-3 pb-3 pt-3 sm:px-6 sm:pb-4 sm:pt-4 lg:px-8 lg:pb-3 lg:pt-3">
        <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-5 xl:gap-7">
          <div className="min-w-0 px-1 py-3 sm:px-3 lg:py-3">
            <div className="max-w-[42rem]">
              <p className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.32em] text-emerald-100 sm:text-xs">
                <span className="h-3 w-3 shrink-0 rounded-full bg-[#26e6a4] shadow-[0_0_18px_rgba(38,230,164,0.92)]" />
                {copy.eyebrow}
              </p>

              <div data-homepage-hero-title-row className="mt-5 flex max-w-full flex-wrap items-center gap-x-4 gap-y-3">
                <h1 className="cmm-home-hero-title max-w-full font-black leading-[0.88] tracking-[-0.085em] text-white drop-shadow-[0_12px_26px_rgba(0,37,27,0.18)] lg:whitespace-nowrap">
                  CleanMyMap
                </h1>
                <HomeHeroLocaleSwitcher locale={locale} setLocale={setLocale} />
              </div>
              <p className="mt-5 max-w-[37rem] text-[clamp(1.05rem,1.4vw,1.24rem)] leading-[1.48] text-white/90">
                {copy.brandSlogan}
              </p>

              <CmmButtonGroup
                layout="two-column"
                className="mt-6 max-w-[38rem] gap-1.5 sm:mt-7 sm:gap-2"
              >
                {heroActions.map(({ id, href, icon: Icon, tone, width, showArrow }) => (
                  <CmmButton
                    key={href}
                    href={href}
                    tone={tone}
                    variant="pill"
                    size="md"
                    width={width}
                  >
                    <Icon size={22} strokeWidth={2.2} aria-hidden="true" />
                    <span>{copy.actions[id]}</span>
                    {showArrow ? <ArrowRight size={21} aria-hidden="true" /> : null}
                  </CmmButton>
                ))}
              </CmmButtonGroup>
              <RibbonTutorial locale={locale} entryPoint="homepage" />
            </div>
          </div>

          <HomeMapPreview />
        </div>

        <section className="relative mt-4 overflow-visible sm:mt-5 lg:mt-5">
          <div className="relative z-10 flex flex-wrap items-center justify-start gap-3 px-1 sm:gap-3 sm:px-2">
            <p className="cmm-home-impact-title flex items-center gap-3 font-black leading-none tracking-[-0.055em] text-white">
              <span className="h-3 w-3 shrink-0 rounded-full bg-[#26e6a4] shadow-[0_0_15px_rgba(38,230,164,0.7)] sm:h-4 sm:w-4" />
              {copy.impactTitle}
            </p>
            <CmmButton
              href="/methodologie#indicateurs-impact-terrain"
              tone="secondary"
              variant="pill"
              className="h-9 !border !border-[#047957] !bg-white/90 !text-[#047957] !shadow-[0_10px_24px_-16px_rgba(0,40,30,0.4)] hover:!bg-white"
            >
              <span className="text-[#7c3aed]">{copy.methodology}</span>
              <ArrowRight size={14} aria-hidden="true" />
            </CmmButton>
          </div>

          <p
            role="status"
            data-impact-snapshot-version={impactSnapshot?.methodologyVersion ?? "unavailable"}
            className="relative z-10 mt-2 px-1 text-xs font-semibold text-white/85 sm:px-2"
          >
            {impactSnapshot
              ? `${copy.snapshotGenerated(snapshotDateLabel ?? "")} ${copy.snapshotUpdate}`
              : `${copy.snapshotUnavailable} ${copy.snapshotUpdate}`}
          </p>

          <div className="relative z-10 mt-5 grid w-full grid-cols-2 gap-3 px-1 min-[768px]:grid-cols-3 min-[768px]:px-2 min-[1200px]:grid-cols-6 min-[1200px]:gap-3 min-[1200px]:px-3">
            {metrics.map((metric) => (
              <HomeImpactKpiCard
                key={metric.key}
                metric={metric}
                impactSnapshot={impactSnapshot}
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
