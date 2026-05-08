"use client";
import { useEffect } from "react";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { LearnPracticeGuideIntro } from "@/components/learn/learn-practice-guide-intro";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { LearnVisualCard } from "@/components/learn/learn-visual-card";
import { LEARN_PRACTICE_LINKS } from "@/lib/learning/learn-rubric-data";
import { recordLearnPageVisit } from "@/lib/learning/learn-progress";

export default function LearnBonnesPratiquesPage() {
  const { locale } = useSitePreferences();
  const links = LEARN_PRACTICE_LINKS[locale];
  const introTitle = { fr: "Bonnes pratiques", en: "Best practices" };
  const introQuestion = {
    fr: "Comment garder le bon réflexe sans alourdir l'action ?",
    en: "How do we keep the right reflex without slowing the action?",
  };
  const introClue = {
    fr: "Avant / pendant / après : une lecture rapide pour agir juste.",
    en: "Before / during / after: a quick read to act well.",
  };

  useEffect(() => {
    recordLearnPageVisit("bonnes-pratiques");
  }, []);

  return (
    <LearnRubricShell
      title={{ fr: "Bonnes pratiques", en: "Best practices" }}
      subtitle={{
        fr: "Les gestes utiles avant, pendant et après l'action",
        en: "Useful gestures before, during and after action",
      }}
      description={{
        fr: "Une sélection courte de guides et d'entrées opérationnelles pour garder le bon réflexe sans se confondre avec le bloc Agir.",
        en: "A short selection of guides and operational entries to keep the right reflex without overlapping the Act block.",
      }}
      backHref="/learn/hub"
      backLabel={{ fr: "Retour au hub", en: "Back to hub" }}
      accent="emerald"
      highlights={[
        { fr: "Gestes opérationnels", en: "Operational gestures" },
        { fr: "Guides pratiques", en: "Practical guides" },
        { fr: "Réflexes utiles", en: "Useful reflexes" },
      ]}
      cta={{
        href: "/learn/ressources",
        label: { fr: "Voir les ressources", en: "See resources" },
      }}
    >
      <div className="space-y-6">
        <LearnPracticeGuideIntro
          locale={locale}
          title={introTitle}
          question={introQuestion}
          clue={introClue}
          cta={{
            href: links[0]?.href ?? "/sections/recycling",
            label: { fr: "Ouvrir le premier guide", en: "Open the first guide" },
          }}
        />

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              {locale === "fr" ? "Guides courts" : "Short guides"}
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
              {locale === "fr"
                ? "Les repères à garder sous la main"
                : "Keep these cues close at hand"}
            </h3>
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
      </div>
    </LearnRubricShell>
  );
}
