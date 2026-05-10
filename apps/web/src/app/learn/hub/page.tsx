"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Clock3,
  Compass,
  GraduationCap,
  Layers3,
  Sparkles,
} from "lucide-react";
import { CognitivePrimer } from "@/components/learn/cognitive-primer";
import { CognitiveSignalChip } from "@/components/learn/cognitive-signal-chip";
import { LearnVisualCard } from "@/components/learn/learn-visual-card";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { useTranslation } from "@/lib/i18n/use-translation";
import {
  LEARN_OVERVIEW_CARDS,
  LEARN_PRACTICE_LINKS,
} from "@/lib/learning/learn-rubric-data";
import {
  LEARN_PROGRESS_ORDER,
  readLearnProgressState,
  recordLearnPageVisit,
  type LearnPageId,
} from "@/lib/learning/learn-progress";

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

  const resolvedLocale = locale === "fr" ? "fr-FR" : "en-GB";
  return new Intl.DateTimeFormat(resolvedLocale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function LearnHubPage() {
  const { locale } = useSitePreferences();
  const { t } = useTranslation("learnHub");
  const [progressValue, setProgressValue] = useState(() => readLearnProgressState());

  useEffect(() => {
    setProgressValue(recordLearnPageVisit("hub"));
  }, []);

  const practiceCards = useMemo(() => LEARN_PRACTICE_LINKS[locale].slice(0, 6), [locale]);
  const overviewCards = LEARN_OVERVIEW_CARDS[locale];

  const visitedPages = progressValue?.visitedPages.filter((page) => page !== "hub") ?? [];
  const completedCount = visitedPages.length;
  const totalPages = JOURNEY_ORDER.length;
  const progressPercent = Math.round((completedCount / totalPages) * 100);
  const nextPageId =
    JOURNEY_ORDER.find((pageId) => !visitedPages.includes(pageId)) ?? JOURNEY_ORDER[0];
  const nextPageLabel = PAGE_LABELS[nextPageId][locale];
  const nextPageHref = PAGE_HREFS[nextPageId];
  const nextPageCard = overviewCards.find((card) => card.href === nextPageHref) ?? overviewCards[0];
  const lastPageId = progressValue?.lastPage ?? "hub";
  const lastPageLabel =
    lastPageId === "hub"
      ? locale === "fr"
        ? "Point de départ"
        : "Starting point"
      : PAGE_LABELS[lastPageId as Exclude<LearnPageId, "hub">][locale];
  const lastUpdatedAt = getLocaleDate(locale, progressValue?.lastUpdatedAt ?? null);

  return (
    <div className="w-full space-y-8 p-4 md:p-8">
      <section className="relative overflow-hidden rounded-[2.25rem] border border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,252,242,0.98),rgba(255,255,255,0.98))] px-6 py-8 text-slate-900 shadow-[0_24px_56px_-32px_rgba(251,191,36,0.18)] md:px-10 md:py-10">
        <div className="absolute inset-0 opacity-100">
          <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-yellow-200/24 blur-3xl" />
          <div className="absolute left-0 top-16 h-52 w-52 rounded-full bg-yellow-100/26 blur-3xl" />
          <div className="absolute bottom-0 right-1/3 h-24 w-24 rounded-full bg-yellow-100/30 blur-2xl" />
        </div>

        <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-900">
                <Sparkles size={14} aria-hidden="true" />
                {locale === "fr" ? "Hub pédagogique" : "Learning hub"}
              </span>
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700">
                {locale === "fr" ? "Index + reprise" : "Index + resume"}
              </span>
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700">
                {locale === "fr" ? "Lecture en moins d'1 minute" : "Less than 1 minute read"}
              </span>
            </div>

            <div className="max-w-3xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-amber-200 bg-white p-3 shadow-sm">
                  <GraduationCap size={30} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">
                    {t("header_suptitle")}
                  </p>
                  <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-6xl">
                    {t("header_title")}
                  </h1>
                </div>
              </div>

              <p className="max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
                {t("header_desc")}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={nextPageHref}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2.5 text-sm font-black text-slate-900 transition hover:-translate-y-[1px] hover:bg-amber-50"
              >
                <BookOpen size={16} aria-hidden="true" />
                {locale === "fr" ? "Reprendre maintenant" : "Resume now"}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link
                href="/learn/comprendre"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-900 transition hover:-translate-y-[1px] hover:bg-amber-100"
              >
                <Layers3 size={16} aria-hidden="true" />
                {locale === "fr" ? "Commencer par le contexte" : "Start with context"}
              </Link>
            </div>
          </div>

          <aside className="rounded-[1.75rem] border border-amber-200/70 bg-white p-5 shadow-[0_20px_40px_-28px_rgba(251,191,36,0.16)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">
                  {locale === "fr" ? "Reprise" : "Resume"}
                </p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                  {locale === "fr" ? "Où vous en êtes" : "Where you left off"}
                </h2>
              </div>
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-900">
                {progressPercent}% {locale === "fr" ? "parcours" : "path"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                  {locale === "fr" ? "Dernière étape" : "Last step"}
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">{lastPageLabel}</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                  {locale === "fr" ? "Pages ouvertes" : "Opened pages"}
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {completedCount}/{totalPages}
                </p>
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

            <div className="mt-5 rounded-2xl border border-amber-100 bg-white p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">
                {locale === "fr" ? "Prochaine page" : "Next page"}
              </p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">{nextPageLabel}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {nextPageCard.detail}
                  </p>
                </div>
                <Link
                  href={nextPageHref}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 text-sm font-black text-amber-900 transition hover:bg-amber-100"
                >
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <CognitivePrimer
        locale={locale}
        highlightRubricId="learn"
        className="border-amber-200/70 bg-white/84"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[2rem] border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Compass size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                {locale === "fr" ? "Parcours" : "Path"}
              </p>
              <p className="text-2xl font-black tracking-tight cmm-text-primary">
                {progressPercent}%
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-yellow-100">
            <div className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-yellow-200 to-amber-100" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="mt-3 text-sm cmm-text-secondary">
            {locale === "fr" ? "La progression reste visible, sans écran intermédiaire superflu." : "Progress stays visible without extra intermediate screens."}
          </p>
        </div>

        <div className="rounded-[2rem] border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Layers3 size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                {locale === "fr" ? "Rubriques" : "Sections"}
              </p>
              <p className="text-2xl font-black tracking-tight cmm-text-primary">
                {totalPages}
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {overviewCards.map((card, index) => (
              <span
                key={card.href}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-sm font-black text-amber-700"
              >
                0{index + 1}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm cmm-text-secondary">
            {locale === "fr" ? "Chaque rubrique garde une lecture brève et une porte visuelle." : "Each section keeps a short read and a visual entry point."}
          </p>
        </div>

        <div className="rounded-[2rem] border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <BookOpen size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                {locale === "fr" ? "Raccourcis" : "Shortcuts"}
              </p>
              <p className="text-2xl font-black tracking-tight cmm-text-primary">
                {practiceCards.length}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {practiceCards.slice(0, 3).map((card) => (
              <span
                key={card.href}
                className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-800"
              >
                {card.title}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm cmm-text-secondary">
            {locale === "fr" ? "Les raccourcis sont présentés comme des cartes d'action." : "Shortcuts are presented as action cards."}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Compass size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                {locale === "fr" ? "Reprendre vite" : "Quick resume"}
              </p>
              <h3 className="text-lg font-black tracking-tight cmm-text-primary">
                {locale === "fr" ? "Une seule action utile" : "One useful next step"}
              </h3>
            </div>
          </div>
          <p className="mt-3 text-sm cmm-text-secondary">
            {locale === "fr"
              ? "Le hub n'empile pas les contenus. Il remet la bonne page devant vous, puis laisse chaque rubrique faire son travail."
              : "The hub does not stack all the content. It brings the right page back in front of you, then lets each section do its job."}
          </p>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Brain size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                {locale === "fr" ? "Ancrage cognitif" : "Cognitive anchor"}
              </p>
              <h3 className="text-lg font-black tracking-tight cmm-text-primary">
                {locale === "fr" ? "Lire, revoir, retenir" : "Read, revisit, retain"}
              </h3>
            </div>
          </div>
          <p className="mt-3 text-sm cmm-text-secondary">
            {locale === "fr"
              ? "Les rubriques restent courtes: contexte, pratique, repères. L'objectif est de mieux revenir demain, pas de tout absorber d'un coup."
              : "The sections stay short: context, practice, cues. The goal is to come back better tomorrow, not to absorb everything at once."}
          </p>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Clock3 size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                {locale === "fr" ? "Temps utile" : "Useful time"}
              </p>
              <h3 className="text-lg font-black tracking-tight cmm-text-primary">
                {locale === "fr" ? "Moins d'une minute par carte" : "Less than a minute per card"}
              </h3>
            </div>
          </div>
          <p className="mt-3 text-sm cmm-text-secondary">
            {locale === "fr"
              ? "Chaque carte est conçue pour une consultation rapide, avec un lien explicite vers la suite logique."
              : "Each card is designed for a quick read, with an explicit link to the logical next step."}
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-amber-200/70 bg-white/88 p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Parcours recommandé" : "Recommended path"}
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight cmm-text-primary md:text-3xl">
              {locale === "fr"
                ? "Quatre pages dédiées, une seule porte d'entrée"
                : "Four dedicated pages, one entry point"}
            </h2>
          </div>
          <Link
            href={nextPageHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-900 transition hover:-translate-y-[1px] hover:bg-amber-100"
          >
            {locale === "fr" ? "Continuer" : "Continue"}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card, index) => (
            <LearnVisualCard
              key={card.href}
              locale={locale}
              card={card}
              index={index + 1}
              className="min-h-full"
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <article className="rounded-[2rem] border border-amber-200/70 bg-white/88 p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                {locale === "fr" ? "Repères de progression" : "Progress cues"}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight cmm-text-primary">
                {locale === "fr" ? "Ce que vous avez déjà activé" : "What you have already activated"}
              </h2>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-800">
              {completedCount}/{totalPages}
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-800">
                {locale === "fr" ? "Dernière page ouverte" : "Last opened page"}
              </p>
              <p className="mt-2 text-lg font-bold cmm-text-primary">{lastPageLabel}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-800">
                {locale === "fr" ? "Dernière action utile" : "Last useful step"}
              </p>
              <p className="mt-2 text-sm cmm-text-secondary">
                {locale === "fr"
                  ? "La reprise est pensée pour revenir sur la bonne rubrique sans repasser par un écran dense."
                  : "The resume flow is designed to jump back to the right section without revisiting a dense screen."}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-800">
                {locale === "fr" ? "Leçons du bloc" : "Block lessons"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CognitiveSignalChip
                  label={locale === "fr" ? "Contexte" : "Context"}
                  tone="amber"
                />
                <CognitiveSignalChip
                  label={locale === "fr" ? "Rappel actif" : "Active recall"}
                  tone="violet"
                />
                <CognitiveSignalChip
                  label={locale === "fr" ? "Courte lecture" : "Short read"}
                  tone="cyan"
                />
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-amber-200/70 bg-white/88 p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                {locale === "fr" ? "Raccourcis utiles" : "Useful shortcuts"}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight cmm-text-primary">
                {locale === "fr" ? "Quand il faut aller plus loin" : "When you need to go further"}
              </h2>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-800">
              {locale === "fr" ? "Terrain, tri, compost" : "Field, sorting, compost"}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {practiceCards.map((card) => (
              <LearnVisualCard
                key={card.href}
                locale={locale}
                card={card}
                compact
                className="min-h-full"
              />
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              {locale === "fr" ? "Passerelle vers Agir" : "Bridge to Act"}
            </p>
            <p className="mt-2 text-sm cmm-text-secondary">
              {locale === "fr"
                ? "Les consignes de terrain détaillées ont quitté Apprendre. Si vous devez préparer une sortie, ouvrez le bloc Agir pour les étapes opérationnelles."
                : "Detailed field instructions have left Learn. If you need to prepare an outing, open the Act block for operational steps."}
            </p>
            <Link
              href="/sections/guide"
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold cmm-text-primary transition hover:-translate-y-[1px] hover:border-amber-300 hover:text-amber-800"
            >
              <Compass size={16} aria-hidden="true" />
              {locale === "fr" ? "Aller vers Agir" : "Go to Act"}
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
