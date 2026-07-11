"use client";

import Image from "next/image";
import { ArrowRight, CalendarDays, ExternalLink } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { cn } from "@/lib/utils";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

type LocalizedText = {
  fr: string;
  en: string;
};

export type LearnPartnerInsightImage = {
  src: string;
  alt: string;
  credit?: string;
};

export type LearnPartnerInsightCardVariant = "featured" | "compact";

export type LearnPartnerInsightCardProps = {
  locale: LearnLocale;
  variant?: LearnPartnerInsightCardVariant;
  title: LocalizedText;
  summary: LocalizedText;
  keyPoints: LocalizedText[];
  action: LocalizedText;
  sourceName: LocalizedText;
  sourceUrl: string;
  publishedAt: string;
  image?: LearnPartnerInsightImage;
  imageCredit?: string;
  className?: string;
};

function formatPublishedAt(locale: LearnLocale, publishedAt: string) {
  const date = new Date(`${publishedAt}T00:00:00Z`);

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function LearnPartnerInsightCard({
  locale,
  variant = "featured",
  title,
  summary,
  keyPoints,
  action,
  sourceName,
  sourceUrl,
  publishedAt,
  image,
  imageCredit,
  className,
}: LearnPartnerInsightCardProps) {
  const isCompact = variant === "compact";
  const formattedDate = formatPublishedAt(locale, publishedAt);
  const buttonLabel = locale === "fr" ? "Ouvrir la source" : "Open source";

  return (
    <CmmCard
      tone="amber"
      variant={isCompact ? "outlined" : "elevated"}
      className={cn("flex h-full flex-col gap-4 p-4 md:p-5", className)}
    >
      {image ? (
        <figure className="overflow-hidden rounded-[1.3rem] border border-amber-200 bg-white">
          <div className="relative h-48 w-full">
            <Image src={image.src} alt={image.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          </div>
          {imageCredit ? (
            <figcaption className="border-t border-amber-100 px-4 py-2 cmm-text-caption text-amber-700">
              {imageCredit}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? (isCompact ? "Éclairage" : "Éclairage Gestes Propres") : "Gestes Propres insight"}
          </p>
          <h4 className={cn("mt-1 font-black tracking-tight cmm-text-primary", isCompact ? "text-base" : "text-lg")}>
            {title[locale]}
          </h4>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <p className={cn("leading-relaxed cmm-text-secondary", isCompact ? "cmm-text-small" : "text-sm")}>
        {isCompact ? action[locale] : summary[locale]}
      </p>

      {isCompact ? null : (
        <ul className="space-y-2">
          {keyPoints.slice(0, 3).map((point) => (
            <li key={point.fr} className="flex gap-2 rounded-2xl border border-amber-100 bg-amber-50/45 px-3 py-2">
              <span className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-black text-amber-900">
                •
              </span>
              <span className="cmm-text-small leading-relaxed cmm-text-primary">{point[locale]}</span>
            </li>
          ))}
        </ul>
      )}

      {isCompact ? null : (
        <div className="rounded-[1.2rem] border border-amber-100 bg-white px-4 py-3">
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Action concrète" : "Concrete action"}
          </p>
          <p className="mt-1 cmm-text-small leading-relaxed cmm-text-primary">{action[locale]}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-100 pt-3">
        <div className="space-y-1">
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
            {sourceName[locale]}
          </p>
          <p className="inline-flex items-center gap-1.5 cmm-text-caption font-semibold text-amber-900">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <time dateTime={publishedAt}>{formattedDate}</time>
          </p>
        </div>

        <CmmButton asChild tone="secondary" variant="pill" className="min-h-11 px-4 py-2.5 cmm-text-caption font-black uppercase tracking-[0.16em]">
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`${sourceName[locale]} - ${buttonLabel}`}>
            {buttonLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </CmmButton>
      </div>
    </CmmCard>
  );
}
