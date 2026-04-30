"use client";

import { Clock3, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CognitiveSignalChip } from "@/components/learn/cognitive-signal-chip";
import type {
  CognitiveQuizStateId,
  CognitiveQuizSummary,
  CognitiveRubricId,
  SupportedLocale,
} from "@/lib/learning/cognitive-principles";
import {
  COGNITIVE_MICRO_RECALLS,
  COGNITIVE_RUBRICS,
  formatCognitiveDate,
  getQuizStateLabel,
} from "@/lib/learning/cognitive-principles";

type CognitivePrimerProps = {
  locale: SupportedLocale;
  summary?: CognitiveQuizSummary | null;
  focusState?: CognitiveQuizStateId | null;
  highlightRubricId?: CognitiveRubricId;
  className?: string;
};

const STATE_TONES: Record<
  CognitiveQuizStateId,
  { chip: string; text: string; dot: string }
> = {
  new: {
    chip: "border-cyan-500/20 bg-cyan-500/10 text-cyan-100",
    text: "cmm-text-secondary",
    dot: "bg-cyan-300",
  },
  failed: {
    chip: "border-rose-500/20 bg-rose-500/10 text-rose-100",
    text: "cmm-text-secondary",
    dot: "bg-rose-300",
  },
  due: {
    chip: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    text: "cmm-text-secondary",
    dot: "bg-amber-300",
  },
  mastered: {
    chip: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    text: "cmm-text-secondary",
    dot: "bg-emerald-300",
  },
};

export function CognitivePrimer({
  locale,
  summary,
  focusState,
  highlightRubricId = "quiz",
  className,
}: CognitivePrimerProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)]/78 p-4 shadow-none backdrop-blur-sm sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-500/10 text-emerald-500">
              <Sparkles size={16} aria-hidden="true" />
            </span>
            <p className="cmm-text-caption font-bold uppercase tracking-[0.2em] cmm-text-muted">
              {locale === "fr" ? "Structure cognitive" : "Cognitive structure"}
            </p>
          </div>
          <p className="max-w-2xl cmm-text-small cmm-text-secondary">
            {locale === "fr"
              ? "Les rubriques ci-dessous sont organisées pour activer la mémoire, faire revenir les notions au bon moment et garder un rythme simple."
              : "The sections below are arranged to activate memory, bring topics back at the right time, and keep the flow simple."}
          </p>

          <div className="flex flex-wrap gap-2">
            {COGNITIVE_MICRO_RECALLS.map((recall, index) => (
              <CognitiveSignalChip
                key={recall.id}
                label={recall.label[locale]}
                tone={index === 0 ? "emerald" : index === 1 ? "amber" : "violet"}
                title={recall.summary[locale]}
              />
            ))}
          </div>
        </div>

        {summary ? (
          <div className="min-w-0 rounded-[1.5rem] border border-[color:var(--border-default)] bg-[color:var(--bg-muted)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="cmm-text-caption font-bold uppercase tracking-[0.18em] cmm-text-muted">
                  {locale === "fr" ? "Quiz" : "Quiz"}
                </p>
                <p className="mt-1 cmm-text-small cmm-text-secondary">
                  {locale === "fr"
                    ? `${summary.total} questions suivies`
                    : `${summary.total} tracked questions`}
                </p>
              </div>
              {focusState ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]",
                    STATE_TONES[focusState].chip,
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", STATE_TONES[focusState].dot)} />
                  {getQuizStateLabel(focusState, locale)}
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  "new",
                  "failed",
                  "due",
                  "mastered",
                ] as CognitiveQuizStateId[]
              ).map((stateId) => (
                <div
                  key={stateId}
                  className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)]/82 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("h-1.5 w-1.5 rounded-full", STATE_TONES[stateId].dot)} />
                    <p className="cmm-text-caption font-bold uppercase tracking-[0.16em] cmm-text-muted">
                      {getQuizStateLabel(stateId, locale)}
                    </p>
                  </div>
                  <p className="mt-2 text-xl font-black cmm-text-primary">
                    {summary.counts[stateId]}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)]/82 px-3 py-2.5">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
              <div>
                <p className="cmm-text-caption font-bold uppercase tracking-[0.16em] cmm-text-muted">
                  {locale === "fr" ? "Prochaine révision" : "Next review"}
                </p>
                <p className="mt-0.5 cmm-text-small cmm-text-secondary">
                  {formatCognitiveDate(summary.nextReviewAt, locale)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {COGNITIVE_RUBRICS.map((rubric) => {
          const isHighlighted = rubric.id === highlightRubricId;
          return (
            <article
              key={rubric.id}
              className={cn(
                "group rounded-xl border p-4 transition-all duration-150 ease-out hover:-translate-y-[1px] hover:border-[color:var(--border-strong)]",
                isHighlighted
                  ? "border-emerald-400/30 bg-emerald-500/10"
                  : "border-[color:var(--border-default)] bg-[color:var(--bg-sunken)]/40",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" aria-hidden="true" />
                  <p className="cmm-text-small font-black uppercase tracking-[0.16em] cmm-text-primary">
                    {rubric.label[locale]}
                  </p>
                </div>
                <span className="cmm-text-caption font-semibold uppercase tracking-[0.16em] cmm-text-muted">
                  {rubric.principle[locale]}
                </span>
              </div>
              <p className="mt-2 cmm-text-small cmm-text-secondary">
                {rubric.summary[locale]}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
