"use client";

import { Sparkles } from "lucide-react";
import { buildQuizBalanceProgression, buildQuizTypeProgression } from "@/lib/gamification/badges/families";
import { SectionLabel } from "./gamification-shell";

export function QuizProgressionCard({ locale }: { locale: string }) {
  const fr = locale === "fr";
  const quizProgressions = [
    buildQuizTypeProgression(),
    buildQuizBalanceProgression(),
  ];

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <div className="flex items-start justify-between gap-4">
        <SectionLabel
          icon={Sparkles}
          title={fr ? "Progressions quiz" : "Quiz progressions"}
          subtitle={
            fr
              ? "Deux progressions quiz alimentent réellement l'XP: l'une suit la maîtrise par type, l'autre l'entraînement équilibré."
              : "Two quiz progressions now feed real XP: one tracks mastery by type, the other balanced training across all types."
          }
        />
        <span className="inline-flex items-center rounded-full border border-[#efb0a9] bg-[#fff1ef] px-3 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-[#bb362f]">
          {fr ? "Actif" : "Active"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {quizProgressions.map((progression) => (
          <article
            key={progression.id}
            className="rounded-[1.7rem] border border-[#f1dfd8] bg-[#fff8f6] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#c63b35]">
                  {fr ? "Progression active" : "Active progression"}
                </p>
                <p className="mt-1 text-[18px] font-black tracking-[-0.03em] text-[#241411]">
                  {progression.name}
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-[#efb0a9] bg-white px-3 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-[#bb362f]">
                {fr ? "Actif" : "Active"}
              </span>
            </div>

            <p className="mt-3 text-[12px] leading-6 text-[#7a625d]">
              {progression.description}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {progression.tiers.map((tier, index) => (
                <article
                  key={tier.id}
                  className="rounded-[1.35rem] border border-[#f1dfd8] bg-white p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#efc7c1] bg-[#fff8f6] text-[16px]">
                      {tier.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#c63b35]">
                        {fr ? `Palier ${index + 1}` : `Tier ${index + 1}`}
                      </p>
                      <p className="mt-1 text-[13px] font-bold text-[#241411]">
                        {tier.label}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-[#7a625d]">
                    {tier.description}
                  </p>
                </article>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-[1.45rem] border border-[#f0d9d2] bg-[#fff7f5] px-4 py-3 text-[12px] leading-6 text-[#8a716b]">
        {fr
          ? "Ces progressions comptent pour l'XP et restent visibles pour suivre le cap de maîtrise."
          : "These progressions count toward XP and stay visible to track mastery milestones."}
      </div>
    </section>
  );
}
