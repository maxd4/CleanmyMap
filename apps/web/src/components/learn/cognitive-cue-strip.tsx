"use client";

import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { CognitiveSignalChip } from "@/components/learn/cognitive-signal-chip";
import type { CognitiveRubricId, SupportedLocale } from "@/lib/learning/cognitive-principles";
import { getCognitiveRubricById } from "@/lib/learning/cognitive-principles";

type CognitiveCueStripProps = {
  locale: SupportedLocale;
  rubricId: CognitiveRubricId;
  question: string;
  clue: string;
  chips: string[];
  action?: {
    href: string;
    label: string;
  };
  className?: string;
};

const TONES: Record<
  CognitiveRubricId,
  { shell: string; badge: string; glow: string; icon: string }
> = {
  quiz: {
    shell: "border-cyan-500/20 bg-cyan-500/10",
    badge: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
    glow: "text-cyan-300",
    icon: "text-cyan-300",
  },
  learn: {
    shell: "border-violet-500/20 bg-violet-500/10",
    badge: "border-violet-400/20 bg-violet-500/10 text-violet-100",
    glow: "text-violet-300",
    icon: "text-violet-300",
  },
  impact: {
    shell: "border-emerald-500/20 bg-emerald-500/10",
    badge: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    glow: "text-emerald-300",
    icon: "text-emerald-300",
  },
  actions: {
    shell: "border-emerald-500/20 bg-emerald-500/10",
    badge: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    glow: "text-emerald-300",
    icon: "text-emerald-300",
  },
  reports: {
    shell: "border-violet-500/20 bg-violet-500/10",
    badge: "border-violet-400/20 bg-violet-500/10 text-violet-100",
    glow: "text-violet-300",
    icon: "text-violet-300",
  },
  network: {
    shell: "border-cyan-500/20 bg-cyan-500/10",
    badge: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
    glow: "text-cyan-300",
    icon: "text-cyan-300",
  },
};

export function CognitiveCueStrip({
  locale,
  rubricId,
  question,
  clue,
  chips,
  action,
  className,
}: CognitiveCueStripProps) {
  const rubric = getCognitiveRubricById(rubricId);
  const tone = TONES[rubricId];

  return (
    <section
      className={cn(
        "rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)]/72 p-4 shadow-none sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]", tone.badge)}>
              <Lightbulb size={14} className={tone.icon} aria-hidden="true" />
              {rubric.label[locale]}
            </span>
            <span className="inline-flex items-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-muted)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] cmm-text-secondary">
              {rubric.principle[locale]}
            </span>
          </div>

          <h3 className="max-w-3xl text-xl font-black tracking-tight cmm-text-primary md:text-2xl">
            {question}
          </h3>
          <p className="max-w-3xl cmm-text-small cmm-text-secondary">
            {clue}
          </p>
        </div>

        <div className="min-w-0 lg:max-w-md">
          <div className={cn("rounded-xl border p-3", tone.shell)}>
          <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <CognitiveSignalChip
                  key={chip}
                  label={chip}
                  title={chip}
                />
              ))}
            </div>

            {action ? (
              <Link
                href={action.href}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-transparent px-4 py-3 cmm-text-small font-bold cmm-text-primary transition hover:-translate-y-[1px] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-muted)]"
              >
                {action.label}
                <ArrowRight size={16} className={tone.glow} aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
