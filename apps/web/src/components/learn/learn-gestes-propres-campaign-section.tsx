"use client";

import { ArrowRight, ExternalLink, MapPinned, Recycle, Trash2, type LucideIcon } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { cn } from "@/lib/utils";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import { GESTES_PROPRES_CAMPAIGN } from "@/lib/learning/gestes-propres-campaign";

type SituationIcon = LucideIcon;

const SITUATION_ICON_BY_ID: Record<string, SituationIcon> = {
  megot: Trash2,
  canette: Recycle,
  bouteille: Recycle,
  armoire: MapPinned,
};

function SituationCard({
  locale,
  situation,
}: {
  locale: LearnLocale;
  situation: (typeof GESTES_PROPRES_CAMPAIGN.situations)[number];
}) {
  const Icon = SITUATION_ICON_BY_ID[situation.id] ?? Recycle;

  return (
    <CmmCard tone="amber" variant="outlined" className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Situation" : "Situation"}
          </p>
          <h4 className="mt-1 text-lg font-black tracking-tight cmm-text-primary">
            {situation.object[locale]}
          </h4>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <div className="grid gap-2">
        <div className="rounded-[1rem] border border-amber-100 bg-white px-3 py-2">
          <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
            {locale === "fr" ? "Mauvais réflexe" : "Wrong reflex"}
          </p>
          <p className="mt-1 cmm-text-small leading-relaxed cmm-text-primary">
            {situation.badReflex[locale]}
          </p>
        </div>
        <div className="rounded-[1rem] border border-amber-100 bg-amber-50/50 px-3 py-2">
          <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
            {locale === "fr" ? "Bon geste" : "Right gesture"}
          </p>
          <p className="mt-1 cmm-text-small leading-relaxed cmm-text-primary">
            {situation.goodGesture[locale]}
          </p>
        </div>
        <div className="rounded-[1rem] border border-amber-100 bg-white px-3 py-2">
          <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
            {locale === "fr" ? "Solution / filière" : "Solution / stream"}
          </p>
          <p className="mt-1 cmm-text-small leading-relaxed cmm-text-primary">
            {situation.solution[locale]}
          </p>
        </div>
      </div>

      <CmmButton
        href={situation.solutionHref}
        tone="secondary"
        variant="pill"
        className="mt-auto w-full justify-between px-4 py-3 cmm-text-caption font-black uppercase tracking-[0.18em]"
      >
        {situation.solutionLabel[locale]}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </CmmButton>
    </CmmCard>
  );
}

export function LearnGestesPropresCampaignSection({
  locale,
  className,
}: {
  locale: LearnLocale;
  className?: string;
}) {
  const campaign = GESTES_PROPRES_CAMPAIGN;

  return (
    <section
      className={cn(
        "rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))] p-4 shadow-sm md:p-5",
        className,
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
              {campaign.badge[locale]}
            </p>
            <h3 className="text-2xl font-black tracking-tight cmm-text-primary md:text-3xl">
              {campaign.title[locale]}
            </h3>
            <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
              {campaign.period[locale]}
            </p>
            <p className="cmm-text-small leading-relaxed cmm-text-secondary">
              {campaign.summary[locale]}
            </p>
          </div>

          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
            <ExternalLink className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1.5 cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-900">
            {locale === "fr" ? "4 situations" : "4 situations"}
          </span>
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1.5 cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-900">
            {locale === "fr" ? "Mégot, canette, bouteille, encombrant" : "Butt, can, bottle, bulky item"}
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {campaign.situations.map((situation) => (
            <SituationCard key={situation.id} locale={locale} situation={situation} />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-amber-200 bg-white p-4">
          <div className="max-w-2xl space-y-1">
            <p className="text-base font-black tracking-tight cmm-text-primary">
              {locale === "fr" ? "Source et attribution" : "Source and attribution"}
            </p>
            <p className="cmm-text-small leading-relaxed cmm-text-secondary">
              {locale === "fr"
                ? `Source : ${campaign.sourceName[locale]} · ${campaign.publishedAt}`
                : `Source: ${campaign.sourceName[locale]} · ${campaign.publishedAt}`}
            </p>
            <p className="cmm-text-small leading-relaxed cmm-text-secondary">
              {locale === "fr"
                ? "Le texte reste reformulé dans CleanMyMap et renvoie vers la campagne d’origine."
                : "The text is reformulated in CleanMyMap and links back to the original campaign."}
            </p>
          </div>

          <CmmButton
            href={campaign.sourceUrl}
            tone="secondary"
            variant="pill"
            className="min-h-11 px-4 py-2.5 cmm-text-caption font-black uppercase tracking-[0.16em]"
          >
            {campaign.ctaLabel[locale]}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </CmmButton>
        </div>
      </div>
    </section>
  );
}
