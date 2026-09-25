"use client";

import { Sparkles } from "lucide-react";
import { buildQuizLearningProgressionSummary } from "@/lib/gamification/quiz-learning-progression";
import { SectionLabel } from "./gamification-shell";

export function QuizProgressionCard({ locale }: { locale: string }) {
  const fr = locale === "fr";
  const learningProgression = buildQuizLearningProgressionSummary([]);

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <div className="flex items-start justify-between gap-4">
        <SectionLabel
          icon={Sparkles}
          title={fr ? "Apprentissage" : "Learning"}
          subtitle={
            fr
              ? "Une seule progression Apprentissage rassemble les réponses justes, la diversité des types et leur équilibre."
              : "One Learning progression brings together correct answers, type diversity, and balance across types."
          }
        />
        <span className="inline-flex items-center rounded-full border border-[#efb0a9] bg-[#fff1ef] px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-[#bb362f]">
          {fr ? "Actif" : "Active"}
        </span>
      </div>

      <article className="mt-6 rounded-[1.7rem] border border-[#f1dfd8] bg-[#fff8f6] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#c63b35]">
              {fr ? "Progression principale" : "Main progression"}
            </p>
            <p className="mt-1 text-[18px] font-black tracking-[-0.03em] text-[#241411]">
              {learningProgression.name}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-[#efb0a9] bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-[#bb362f]">
            {fr ? "Actif" : "Active"}
          </span>
        </div>

        <p className="mt-3 text-[12px] leading-6 text-[#7a625d]">
          {fr
            ? "Les paliers existants restent actifs, mais ils nourrissent une seule barre Apprentissage."
            : "Existing milestones remain active, but they feed one Learning bar."}
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            {
              label: fr ? "Réponses justes" : "Correct answers",
              value: fr ? "Total cumulé" : "Cumulative total",
              detail: fr ? "Métrique principale" : "Primary metric",
            },
            {
              label: fr ? "Diversité" : "Diversity",
              value: fr ? "Types maîtrisés" : "Mastered types",
              detail: fr ? "Sous-indicateur" : "Sub-indicator",
            },
            {
              label: fr ? "Équilibre" : "Balance",
              value: fr ? "Minimum par type" : "Minimum per type",
              detail: fr ? "Sous-indicateur" : "Sub-indicator",
            },
          ].map((indicator) => (
            <div key={indicator.label} className="rounded-[1.35rem] border border-[#f1dfd8] bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#c63b35]">
                {indicator.label}
              </p>
              <p className="mt-2 text-[13px] font-bold text-[#241411]">{indicator.value}</p>
              <p className="mt-1 text-xs text-[#7a625d]">{indicator.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {learningProgression.tiers.map((tier, index) => (
            <div key={tier.id} className="rounded-[1.35rem] border border-[#f1dfd8] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#efc7c1] bg-[#fff8f6] text-[16px]">
                  {tier.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-[#c63b35]">
                    {fr ? `Palier ${index + 1}` : `Tier ${index + 1}`}
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-[#241411]">{tier.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </article>

      <div className="mt-5 rounded-[1.45rem] border border-[#f0d9d2] bg-[#fff7f5] px-4 py-3 text-[12px] leading-6 text-[#8a716b]">
        {fr
          ? "Les événements quiz historiques restent inchangés et sont tous rattachés à l'axe Apprentissage."
          : "Historical quiz events remain unchanged and all feed the Learning axis."}
      </div>
    </section>
  );
}
