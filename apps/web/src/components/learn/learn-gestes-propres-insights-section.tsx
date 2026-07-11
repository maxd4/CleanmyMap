"use client";

import { ChevronDown, ExternalLink } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";
import { GESTES_PROPRES_INSIGHTS } from "@/lib/learning/gestes-propres-insights";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import type { LearnPracticeThemeId } from "@/components/learn/learn-practice-theme-tabs";
import { LearnGestesPropresCampaignSection } from "@/components/learn/learn-gestes-propres-campaign-section";
import {
  LearnPartnerInsightCard,
  type LearnPartnerInsightCardVariant,
} from "@/components/learn/learn-partner-insight-card";

type GestesPropresInsightsScope = "theme" | "overview";

type InsightRef = (typeof GESTES_PROPRES_INSIGHTS)[number]["id"];

const THEME_LABELS: Record<"tri" | "compost", { fr: string; en: string }> = {
  tri: { fr: "Bien trier", en: "Sort well" },
  compost: { fr: "Composter", en: "Compost" },
};

const SECTION_CONFIG: Record<
  "tri" | "overview",
  {
    title: { fr: string; en: string };
    lead: { fr: string; en: string };
    visible: { featured?: InsightRef; compact: InsightRef[] };
    hidden: InsightRef[];
    actionLabel?: { fr: string; en: string };
  }
> = {
  tri: {
    title: { fr: "Éclairages Gestes Propres", en: "Gestes Propres insights" },
    lead: {
      fr: "Deux repères suffisent ici: un guide utile pour choisir l’objet et une alerte claire contre la pollution des lingettes.",
      en: "Two cues are enough here: a useful guide for choosing what to do with items and a clear warning against wipe pollution.",
    },
    visible: {
      featured: "que-faire-de-mes-objets",
      compact: ["pollution-lingettes"],
    },
    hidden: [],
  },
  overview: {
    title: { fr: "Pour aller plus loin avec Gestes Propres", en: "To go further with Gestes Propres" },
    lead: {
      fr: "Les six éclairages restent accessibles sans reprendre les résumés détaillés.",
      en: "All six insights stay accessible without repeating the detailed summaries.",
    },
    visible: {
      compact: ["automobilistes-plus-jeter", "que-faire-de-mes-objets", "commercants-levier-activer"],
    },
    hidden: ["poubelles-trop-discretes", "suppression-poubelles", "pollution-lingettes"],
    actionLabel: {
      fr: "Voir les actualités Gestes Propres",
      en: "See Gestes Propres news",
    },
  },
};

function getInsight(id: InsightRef) {
  const insight = GESTES_PROPRES_INSIGHTS.find((entry) => entry.id === id);

  if (!insight) {
    throw new Error(`Missing Gestes Propres insight: ${id}`);
  }

  return insight;
}

function renderInsightCard(locale: LearnLocale, id: InsightRef, variant: LearnPartnerInsightCardVariant) {
  const insight = getInsight(id);

  return (
    <LearnPartnerInsightCard
      key={id}
      locale={locale}
      variant={variant}
      title={insight.title}
      summary={insight.summary}
      keyPoints={insight.keyPoints}
      action={insight.action}
      sourceName={insight.sourceName}
      sourceUrl={insight.sourceUrl}
      publishedAt={insight.publishedAt}
    />
  );
}

export function LearnGestesPropresInsightsSection({
  locale,
  theme,
  scope = "theme",
  className,
}: {
  locale: LearnLocale;
  theme?: Exclude<LearnPracticeThemeId, "compost">;
  scope?: GestesPropresInsightsScope;
  className?: string;
}) {
  if (scope !== "overview" && theme === "reduire") {
    return <LearnGestesPropresCampaignSection locale={locale} className={className} />;
  }

  const config =
    scope === "overview"
      ? SECTION_CONFIG.overview
      : theme === "tri"
        ? SECTION_CONFIG.tri
        : null;

  if (!config) {
    return null;
  }

  const visibleFeatured = "featured" in config.visible ? config.visible.featured : undefined;
  const visibleCompact = config.visible.compact;

  return (
    <section
      className={cn(
        "rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))] p-4 shadow-sm md:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-3xl space-y-2">
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
            {scope === "overview" ? "Gestes Propres" : THEME_LABELS.tri[locale]}
          </p>
          <h4 className="text-xl font-black tracking-tight cmm-text-primary md:text-2xl">
            {config.title[locale]}
          </h4>
          <p className="cmm-text-small leading-relaxed cmm-text-secondary">{config.lead[locale]}</p>
        </div>
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
          <ExternalLink className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className={cn("mt-4 grid gap-3", scope === "overview" ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {visibleFeatured ? renderInsightCard(locale, visibleFeatured, "featured") : null}
        {visibleCompact.map((id) => renderInsightCard(locale, id, "compact"))}
      </div>

      {config.hidden.length > 0 ? (
        <details className="group mt-4 rounded-[1.35rem] border border-amber-200 bg-white px-4 py-3 shadow-sm">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
            <div className="space-y-1 pr-4">
              <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                {scope === "overview" ? "Voir les autres éclairages" : "Voir les autres éclairages"}
              </p>
              <p className="cmm-text-small leading-relaxed cmm-text-secondary">
                {scope === "overview"
                  ? "Les trois contenus restants restent accessibles sans répéter les résumés visibles."
                  : "Les contenus complémentaires restent fermés par défaut pour garder le bloc lisible."}
              </p>
            </div>
            <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 transition group-open:rotate-180">
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </span>
          </summary>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {config.hidden.map((id) => renderInsightCard(locale, id, "compact"))}
          </div>
        </details>
      ) : null}

      {scope === "overview" ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-amber-200 bg-white p-4">
          <p className="cmm-text-small leading-relaxed cmm-text-secondary">
            {locale === "fr"
              ? "Chaque carte ouvre la source officielle sans dupliquer les résumés déjà lisibles."
              : "Each card opens the official source without duplicating the summaries already shown."}
          </p>
          <CmmButton
            href="https://www.gestespropres.com/actualites"
            tone="secondary"
            variant="pill"
            className="min-h-11 px-4 py-2.5 cmm-text-caption font-black uppercase tracking-[0.16em]"
          >
            {config.actionLabel?.[locale] ?? "See news"}
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </CmmButton>
        </div>
      ) : null}
    </section>
  );
}
