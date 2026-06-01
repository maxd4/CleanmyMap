"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  LEARN_OVERVIEW_CARDS,
} from "@/lib/learning/learn-rubric-data";
import {
  LEARN_PROGRESS_ORDER,
  readLearnProgressState,
  recordLearnPageVisit,
  type LearnPageId,
} from "@/lib/learning/learn-progress";
import { resolvePageFamily } from "@/lib/ui/page-families";

type PageCopy = Record<Exclude<LearnPageId, "hub">, { fr: string; en: string }>;

const PAGE_LABELS: PageCopy = {
  comprendre: { fr: "Comprendre", en: "Understand" },
  sentrainer: { fr: "S'entraîner", en: "Practice" },
  "bonnes-pratiques": { fr: "Bonnes pratiques", en: "Best practices" },
  ressources: { fr: "Ressources", en: "Resources" },
};

const PAGE_HREFS: Record<Exclude<LearnPageId, "hub">, string> = {
  comprendre: "/learn/comprendre",
  sentrainer: "/learn/sentrainer",
  "bonnes-pratiques": "/learn/bonnes-pratiques",
  ressources: "/learn/ressources",
};

const JOURNEY_ORDER: Exclude<LearnPageId, "hub">[] = LEARN_PROGRESS_ORDER.filter(
  (pageId): pageId is Exclude<LearnPageId, "hub"> => pageId !== "hub",
);

function getLocaleDate(locale: "fr" | "en", value?: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function LearnHubPage() {
  const { locale } = useSitePreferences();
  const [progressValue, setProgressValue] = useState(() => readLearnProgressState());
  const pageFamily = resolvePageFamily("/learn/hub");

  useEffect(() => {
    setProgressValue(recordLearnPageVisit("hub"));
  }, []);

  const overviewCards = LEARN_OVERVIEW_CARDS[locale];
  const visitedPages = progressValue?.visitedPages.filter((page) => page !== "hub") ?? [];
  const completedCount = visitedPages.length;
  const totalPages = JOURNEY_ORDER.length;
  const progressPercent = Math.round((completedCount / totalPages) * 100);
  const nextPageId =
    JOURNEY_ORDER.find((pageId) => !visitedPages.includes(pageId)) ?? JOURNEY_ORDER[0];
  const nextPageLabel = PAGE_LABELS[nextPageId][locale];
  const nextPageHref = PAGE_HREFS[nextPageId];
  const lastPageId = progressValue?.lastPage ?? "hub";
  const lastPageLabel =
    lastPageId === "hub"
      ? locale === "fr"
        ? "Point de départ"
        : "Starting point"
      : PAGE_LABELS[lastPageId as Exclude<LearnPageId, "hub">][locale];
  const lastUpdatedAt = getLocaleDate(locale, progressValue?.lastUpdatedAt ?? null);
  const currentCards = overviewCards.slice(0, 4);

  return (
    <div className="w-full space-y-8 p-4 md:p-8">
      <section className="relative overflow-hidden rounded-[2.25rem] border border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,252,242,0.98),rgba(255,255,255,0.98))] px-6 py-8 text-slate-900 shadow-[0_24px_56px_-32px_rgba(251,191,36,0.18)] md:px-10 md:py-10">
        <div className="absolute inset-0 opacity-100">
          <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-amber-200/24 blur-3xl" />
          <div className="absolute left-0 top-16 h-52 w-52 rounded-full bg-orange-100/26 blur-3xl" />
        </div>

        <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="space-y-5">
            <PageHeader
              family={pageFamily}
              eyebrow={locale === "fr" ? "Point d'entrée" : "Entry point"}
              title={locale === "fr" ? "Point de départ" : "Starting point"}
              subtitle={
                locale === "fr"
                  ? "Un point de départ léger pour reprendre le parcours sans dupliquer le contenu."
                  : "A lightweight starting point to resume the journey without duplicating content."
              }
              badges={
                <>
                  <PageHeaderBadge family={pageFamily}>
                    {locale === "fr" ? "Point de départ" : "Starting point"}
                  </PageHeaderBadge>
                  <PageHeaderBadge family={pageFamily} muted>
                    {locale === "fr" ? "Progression" : "Progress"}
                  </PageHeaderBadge>
                  <PageHeaderBadge family={pageFamily} muted>
                    {locale === "fr" ? "4 accès directs" : "4 direct links"}
                  </PageHeaderBadge>
                </>
              }
            />

            <div className="flex flex-wrap gap-3">
              <Link
                href={nextPageHref}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2.5 text-sm font-black text-slate-900 transition hover:-translate-y-[1px] hover:bg-amber-50"
              >
                <BookOpen size={16} aria-hidden="true" />
                {locale === "fr" ? "Reprendre" : "Resume"}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <aside className="rounded-[1.75rem] border border-amber-200/70 bg-white p-5 shadow-[0_20px_40px_-28px_rgba(251,191,36,0.16)]">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                  {locale === "fr" ? "Progression" : "Progress"}
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                  {progressPercent}%
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-200 to-amber-100"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                  {locale === "fr" ? "Dernière étape" : "Last step"}
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">{lastPageLabel}</p>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                  {locale === "fr" ? "Dernière mise à jour" : "Last update"}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {lastUpdatedAt ?? (locale === "fr" ? "Jamais" : "Never")}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="rounded-[2rem] border border-amber-200/70 bg-white/92 p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Accès directs" : "Direct links"}
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight cmm-text-primary">
              {locale === "fr"
                ? "Les quatre rubriques où se trouve le contenu réel"
                : "The four sections that contain the actual content"}
            </h2>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-800">
            {currentCards.length}
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {currentCards.map((card, index) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex h-full flex-col justify-between rounded-[1.6rem] border border-amber-200 bg-[linear-gradient(180deg,rgba(255,250,238,0.98),rgba(255,255,255,0.98))] p-5 transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-amber-200 bg-white text-sm font-black text-amber-700">
                  0{index + 1}
                </span>
                <ArrowRight size={16} aria-hidden="true" className="text-amber-600 transition group-hover:translate-x-0.5" />
              </div>
              <div className="mt-4 space-y-2">
                <h3 className="text-lg font-black tracking-tight text-slate-900">
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">{card.detail}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
