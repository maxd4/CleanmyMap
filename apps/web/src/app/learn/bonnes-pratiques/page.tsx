"use client";
import { useEffect } from "react";
import Link from "next/link";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { LEARN_PRACTICE_LINKS } from "@/lib/learning/learn-rubric-data";
import { recordLearnPageVisit } from "@/lib/learning/learn-progress";

export default function LearnBonnesPratiquesPage() {
  const { locale } = useSitePreferences();
  const links = LEARN_PRACTICE_LINKS[locale];

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">
                  {link.title}
                </p>
                <p className="mt-2 cmm-text-small cmm-text-secondary">{link.detail}</p>
              </div>
              <span className="rounded-full bg-emerald-100 p-2 text-emerald-600 transition group-hover:bg-emerald-200 group-hover:text-emerald-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </LearnRubricShell>
  );
}
