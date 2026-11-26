"use client";

import { Check, LockKeyhole, Sparkles } from "lucide-react";
import type { GamificationMilestoneState } from "@/lib/gamification/progression/progression-types";

export function MilestonesPanel({
  milestones,
}: {
  milestones: readonly GamificationMilestoneState[];
}) {
  return (
    <section
      aria-labelledby="gamification-milestones-title"
      className="rounded-2xl border border-current/10 p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.3em] cmm-text-secondary">
            Distinctions ponctuelles
          </p>
          <h3 id="gamification-milestones-title" className="mt-2 text-xl font-black cmm-text-primary">
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
                : "border-current/10"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                  milestone.unlocked
                    ? "bg-amber-300 text-amber-950"
                    : "bg-current/5 cmm-text-secondary"
                }`}
              >
                {milestone.unlocked ? (
                  <Check aria-hidden="true" size={16} />
                ) : (
                  <LockKeyhole aria-hidden="true" size={15} />
                )}
              </span>
              <span className="text-sm font-black uppercase tracking-[0.18em] cmm-text-secondary">
                {milestone.unlocked ? "Acquis" : "À débloquer"}
              </span>
            </div>
            <h4 className="mt-4 text-sm font-black cmm-text-primary">{milestone.label}</h4>
            <p className="mt-2 text-sm cmm-text-body leading-relaxed">{milestone.description}</p>
            <p className="mt-4 text-sm font-black uppercase tracking-[0.16em] cmm-text-secondary">
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
