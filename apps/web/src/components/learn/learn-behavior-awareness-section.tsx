"use client";

import { ArrowRight, Megaphone, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { cn } from "@/lib/utils";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

type LocalizedText = {
  fr: string;
  en: string;
};

type PracticeCard = {
  title: LocalizedText;
  detail: LocalizedText;
  note: LocalizedText;
  icon: LucideIcon;
};

type SourceCard = {
  title: LocalizedText;
  detail: LocalizedText;
  href: string;
  externalLabel: LocalizedText;
  icon: LucideIcon;
};

const PRACTICE_CARDS: PracticeCard[] = [
  {
    title: { fr: "Montrer le bon geste", en: "Show the right gesture" },
    detail: {
      fr: "Un geste visible aide le groupe à comprendre vite ce qu’il faut reproduire.",
      en: "A visible gesture helps the group quickly understand what to copy.",
    },
    note: {
      fr: "Le visible passe avant le long discours.",
      en: "Visibility comes before a long speech.",
    },
    icon: Users,
  },
  {
    title: { fr: "Répéter une consigne courte", en: "Repeat a short rule" },
    detail: {
      fr: "Une consigne simple tient mieux qu’un panneau trop chargé.",
      en: "A simple rule sticks better than an overloaded sign.",
    },
    note: {
      fr: "Court, stable et lisible.",
      en: "Short, stable and readable.",
    },
    icon: Megaphone,
  },
  {
    title: { fr: "Préparer le contexte", en: "Prepare the context" },
    detail: {
      fr: "Le bon environnement réduit les erreurs avant même l’action.",
      en: "The right environment reduces errors before the action starts.",
    },
    note: {
      fr: "Le cadre aide autant que l’explication.",
      en: "The setup helps as much as the explanation.",
    },
    icon: ShieldCheck,
  },
];

const SOURCE_CARDS: SourceCard[] = [
  {
    title: { fr: "Gestes Propres", en: "Gestes Propres" },
    detail: {
      fr: "Normes sociales, visibilité du geste et effet d’entraînement collectif.",
      en: "Social norms, visible gestures and collective momentum.",
    },
    href: "https://www.gestespropres.com/relever-un-defi",
    externalLabel: { fr: "Ouvrir la source", en: "Open source" },
    icon: Users,
  },
  {
    title: { fr: "ADEME", en: "ADEME" },
    detail: {
      fr: "Communication, sensibilisation et leviers d’accompagnement du tri.",
      en: "Communication, awareness and sorting support levers.",
    },
    href: "https://economie-circulaire.ademe.fr/tri-biodechets",
    externalLabel: { fr: "Ouvrir la source", en: "Open source" },
    icon: Megaphone,
  },
  {
    title: { fr: "Ministère", en: "Ministry" },
    detail: {
      fr: "Prévention, sensibilisation et communication locale.",
      en: "Prevention, awareness and local communication.",
    },
    href: "https://www.ecologie.gouv.fr/politiques-publiques/lutte-contre-depots-illegaux-dechets",
    externalLabel: { fr: "Ouvrir la source", en: "Open source" },
    icon: ShieldCheck,
  },
];

function PracticeCardView({
  locale,
  card,
}: {
  locale: LearnLocale;
  card: PracticeCard;
}) {
  const Icon = card.icon;

  return (
    <CmmCard tone="amber" variant="outlined" className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Repère pratique" : "Practical cue"}
          </p>
          <h4 className="mt-1 text-lg font-black tracking-tight cmm-text-primary">
            {card.title[locale]}
          </h4>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <p className="cmm-text-small leading-relaxed cmm-text-secondary">{card.detail[locale]}</p>
      <p className="rounded-2xl border border-amber-100 bg-white px-3 py-2 cmm-text-small font-semibold text-amber-900">
        {card.note[locale]}
      </p>
    </CmmCard>
  );
}

function SourceCardView({
  locale,
  card,
}: {
  locale: LearnLocale;
  card: SourceCard;
}) {
  const Icon = card.icon;

  return (
    <CmmCard tone="amber" variant="outlined" className="flex h-full flex-col justify-between p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Source" : "Source"}
            </p>
            <h5 className="mt-1 text-base font-black tracking-tight cmm-text-primary">{card.title[locale]}</h5>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>

        <p className="cmm-text-small leading-relaxed cmm-text-secondary">{card.detail[locale]}</p>
      </div>

      <CmmButton
        href={card.href}
        tone="secondary"
        variant="pill"
        className="mt-4 w-full justify-between px-4 py-3 cmm-text-caption font-black uppercase tracking-[0.18em]"
      >
        {card.externalLabel[locale]}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </CmmButton>
    </CmmCard>
  );
}

export function LearnBehaviorAwarenessSection({
  locale,
  id,
}: {
  locale: LearnLocale;
  id?: string;
}) {
  return (
    <section id={id} className="rounded-[2rem] border border-amber-200/80 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Repères pratiques" : "Practical cues"}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight cmm-text-primary">
            {locale === "fr"
              ? "Le geste tient mieux quand il reste visible, simple et cohérent"
              : "The gesture sticks better when it stays visible, simple and coherent"}
          </h3>
          <p className="mt-2 cmm-text-small leading-relaxed cmm-text-secondary">
            {locale === "fr"
              ? "On garde ici seulement ce qui aide à agir tout de suite; les sources restent disponibles plus bas."
              : "Only the parts that help immediate action remain here; sources stay available below."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
          <Megaphone className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {PRACTICE_CARDS.map((card) => (
          <PracticeCardView key={card.title.fr} locale={locale} card={card} />
        ))}
      </div>

      <details className="group mt-5 rounded-[1.35rem] border border-amber-200 bg-amber-50/40 px-4 py-3">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 focus-visible:outline-none">
          <div className="space-y-1 pr-4">
            <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Pour aller plus loin" : "To go further"}
            </p>
            <p className="cmm-text-small leading-relaxed cmm-text-secondary">
              {locale === "fr"
                ? "Sources et compléments quand l’utilisateur veut aller plus loin."
                : "Sources and extras when the user wants to go further."}
            </p>
          </div>
          <span className={cn("mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-white text-amber-700 transition group-open:rotate-180")}>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </summary>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {SOURCE_CARDS.map((card) => (
            <SourceCardView key={card.title.fr} locale={locale} card={card} />
          ))}
        </div>
      </details>
    </section>
  );
}
