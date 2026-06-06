"use client";

"use client";

import { Clock3, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CognitiveSignalChip } from "@/components/learn/cognitive-signal-chip";
import type {
  CognitiveQuizStateId,
  CognitiveQuizSummary,
  SupportedLocale,
} from "@/lib/learning/cognitive-principles";
import { formatCognitiveDate, getQuizStateLabel } from "@/lib/learning/cognitive-principles";

type QuizArchitectureStripProps = {
  locale: SupportedLocale;
  summary: CognitiveQuizSummary;
  focusState?: CognitiveQuizStateId | null;
  className?: string;
};

const STATE_TONES: Record<CognitiveQuizStateId, "cyan" | "amber" | "violet" | "emerald"> = {
  new: "cyan",
  failed: "amber",
  due: "violet",
  mastered: "emerald",
};

export function QuizArchitectureStrip({
  locale,
  summary,
  focusState,
  className,
}: QuizArchitectureStripProps) {
  const stateOrder: CognitiveQuizStateId[] = ["due", "failed", "new", "mastered"];

  return (
    <section
      className={cn(
        "rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)]/78 p-4 shadow-none sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <CognitiveSignalChip
              label={locale === "fr" ? "Architecture du Quiz" : "Quiz structure"}
              tone="cyan"
              title={locale === "fr" ? "Architecture du Quiz" : "Quiz structure"}
            />
            <CognitiveSignalChip
              label={locale === "fr" ? "Questions mélangées" : "Mixed questions"}
              tone="violet"
              title={locale === "fr" ? "Séance mélangée par thème" : "Mixed by theme"}
            />
          </div>
          <p className="max-w-2xl cmm-text-small cmm-text-secondary">
            {locale === "fr"
              ? "Le Quiz donne la priorité aux questions à revoir, mélange les thèmes et garde la prochaine révision visible."
              : "The Quiz prioritizes items to review, mixes themes, and keeps the next review visible."}
          </p>
        </div>

        <div className="min-w-0 lg:max-w-md">
          <div className="flex flex-wrap gap-2">
            {stateOrder.map((stateId) => (
              <CognitiveSignalChip
                key={stateId}
                label={`${getQuizStateLabel(stateId, locale)}: ${summary.counts[stateId]}`}
                tone={STATE_TONES[stateId]}
                title={getQuizStateLabel(stateId, locale)}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-muted)] px-3 py-2.5">
            <span className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] cmm-text-secondary">
              <Shuffle size={14} aria-hidden="true" />
              {locale === "fr" ? "Ordre adaptatif" : "Adaptive order"}
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] cmm-text-secondary">
              <Clock3 size={14} aria-hidden="true" />
              {formatCognitiveDate(summary.nextReviewAt, locale)}
            </span>
          </div>

          <p className="mt-2 cmm-text-caption font-semibold uppercase tracking-[0.16em] cmm-text-muted">
            {locale === "fr"
              ? "Séance priorisée par état, puis alternée par thème."
              : "Session prioritized by state, then alternated by theme."}
          </p>

          {focusState ? (
            <p className="mt-3 cmm-text-caption font-semibold uppercase tracking-[0.16em] cmm-text-muted">
              {locale === "fr"
                ? `Séance prioritaire: ${getQuizStateLabel(focusState, locale)}`
                : `Priority session: ${getQuizStateLabel(focusState, locale)}`}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
