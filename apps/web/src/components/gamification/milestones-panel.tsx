"use client";

import { Check, LockKeyhole, Sparkles } from "lucide-react";
import type { GamificationMilestoneState } from "@/lib/gamification/progression-types";

export function MilestonesPanel({
  milestones,
}: {
  milestones: readonly GamificationMilestoneState[];
}) {
  return (
    <section
      aria-labelledby="gamification-milestones-title"
      className="mt-8 rounded-[2rem] border border-amber-500/15 bg-amber-500/[0.04] p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-300/80">
            Distinctions ponctuelles
          </p>
          <h3 id="gamification-milestones-title" className="mt-2 text-xl font-black text-white">
            Jalons
          </h3>
          <p className="mt-2 max-w-2xl text-sm cmm-text-body leading-relaxed">
            Des faits uniques, acquis une seule fois, sans barre de progression infinie.
          </p>
        </div>
        <Sparkles aria-hidden="true" className="mt-1 shrink-0 text-amber-300" size={20} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {milestones.map((milestone) => (
          <article
            key={milestone.id}
            className={`rounded-2xl border p-4 ${
              milestone.unlocked
                ? "border-amber-300/25 bg-amber-300/[0.08]"
                : "border-white/8 bg-slate-950/30"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                  milestone.unlocked
                    ? "bg-amber-300 text-amber-950"
                    : "bg-white/8 text-slate-500"
                }`}
              >
                {milestone.unlocked ? (
                  <Check aria-hidden="true" size={16} />
                ) : (
                  <LockKeyhole aria-hidden="true" size={15} />
                )}
              </span>
              <span className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                {milestone.unlocked ? "Acquis" : "À débloquer"}
              </span>
            </div>
            <h4 className="mt-4 text-sm font-black text-white">{milestone.label}</h4>
            <p className="mt-2 text-sm cmm-text-body leading-relaxed">{milestone.description}</p>
            <p className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-amber-200/80">
              {milestone.xpAwarded > 0
                ? `+${milestone.xpAwarded} XP ponctuels`
                : "Aucun XP supplémentaire"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
