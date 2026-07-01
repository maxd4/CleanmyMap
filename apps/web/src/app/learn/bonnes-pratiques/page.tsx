"use client";

import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { LearnPracticeGuideIntro } from "@/components/learn/learn-practice-guide-intro";
import { LearnBlockJourneySection } from "@/components/learn/learn-block-journey-section";
import { LearnBehaviorAwarenessSection } from "@/components/learn/learn-behavior-awareness-section";
import { LearnTriContextSection } from "@/components/learn/learn-tri-context-section";
import { LearnVisualCard } from "@/components/learn/learn-visual-card";
import { LearnPageVisitTracker } from "@/components/learn/learn-page-visit-tracker";
import { LEARN_PRACTICE_LINKS } from "@/lib/learning/learn-rubric-data";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { Recycle, Sprout, Users } from "lucide-react";

export default function LearnTriComposteComportementsPage() {
  const { locale } = useSitePreferences();
  const links = LEARN_PRACTICE_LINKS[locale];
  const introTitle = {
    fr: "Tri, composte, comportements",
    en: "Sorting, composting, behaviors",
  };
  const introQuestion = {
    fr: "Comment trier juste, composter mieux et choisir vite le bon geste ?",
    en: "How do we sort right, compost better and choose the right gesture quickly?",
  };
  const introClue = {
    fr: "Après la vulgarisation et l'entraînement, cette page sert à trancher vite: le bon guide, la bonne filière, le bon comportement.",
    en: "After explanation and practice, this page helps you decide fast: the right guide, the right stream, the right behavior.",
  };
  const entryLinks = [
    {
      href: links[0]?.href ?? "/sections/recycling",
      label: { fr: "Tri", en: "Sorting" },
      detail: {
        fr: "Ouvrir le guide court pour trier sans hésiter.",
        en: "Open the short guide to sort without hesitating.",
      },
      icon: Recycle,
    },
    {
      href: links[1]?.href ?? "/sections/compost",
      label: { fr: "Composte", en: "Composting" },
      detail: {
        fr: "Voir le guide compost pour choisir la bonne filière.",
        en: "See the compost guide and choose the right path.",
      },
      icon: Sprout,
    },
    {
      href: "#ressources-utiles",
      label: { fr: "Comportements utiles", en: "Useful behaviors" },
      detail: {
        fr: "Aller directement aux repères qui aident à agir juste.",
        en: "Jump straight to the cues that help you act right.",
      },
      icon: Users,
    },
  ] as const;

  return (
    <LearnRubricShell
      title={{ fr: "Tri, composte, comportements", en: "Sorting, composting, behaviors" }}
      subtitle={{
        fr: "Point d'appui entre compréhension et action",
        en: "A bridge between understanding and action",
      }}
      description={{
        fr: "Les guides courts restent au premier plan; les pages voisines complètent le parcours quand il faut approfondir.",
        en: "Short guides stay in front; nearby pages complete the route when you need to go deeper.",
      }}
      backHref="/explorer"
      backLabel={{ fr: "Retour au sommaire", en: "Back to summary" }}
      accent="yellow"
      highlights={[
        { fr: "Tri", en: "Sorting" },
        { fr: "Compostage", en: "Composting" },
        { fr: "Comportements utiles", en: "Useful behaviors" },
      ]}
      cta={{
        href: "#guides-courts",
        label: { fr: "Voir les guides courts", en: "See the short guides" },
      }}
    >
      <LearnPageVisitTracker pageId="bonnes-pratiques" />
      <div className="space-y-6">
        <LearnPracticeGuideIntro
          locale={locale}
          title={introTitle}
          question={introQuestion}
          clue={introClue}
          entryLinks={entryLinks}
          cta={{
            href: links[0]?.href ?? "/sections/recycling",
            label: { fr: "Ouvrir le premier guide", en: "Open the first guide" },
          }}
        />

        <div id="guides-courts" className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              {locale === "fr" ? "Guides courts" : "Short guides"}
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
              {locale === "fr"
                ? "Les repères à garder sous la main"
                : "Keep these cues close at hand"}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              {locale === "fr"
                ? "Chaque carte va droit au tri, au compostage ou à l'attitude utile et reste à lire en quelques secondes."
                : "Each card goes straight to sorting, composting or useful behavior and stays readable in a few seconds."}
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {links.length}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {links.map((link, index) => (
            <LearnVisualCard
              key={link.href}
              locale={locale}
              card={link}
              index={index + 1}
              compact
              className="min-h-full"
            />
          ))}
        </div>

        <LearnBehaviorAwarenessSection locale={locale} id="ressources-utiles" />
        <LearnTriContextSection locale={locale} />
        <LearnBlockJourneySection
          locale={locale}
          currentPageId="bonnes-pratiques"
          compact
        />
      </div>
    </LearnRubricShell>
  );
}
