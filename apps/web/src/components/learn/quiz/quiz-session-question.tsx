import { cn } from "@/lib/utils";
import { CognitiveSignalChip } from "@/components/learn/cognitive-signal-chip";
import type {
  CognitiveQuizStateId,
  SupportedLocale,
} from "@/lib/learning/cognitive-principles";
import type { QuizQuestion } from "@/lib/learning/quiz/quiz-question-contract";
import {
  getQuizLocalizedTextFallback,
  getQuizUiCopy,
} from "@/lib/learning/quiz/quiz-i18n";
import {
  getQuizStateLabel,
  STATE_TONES,
} from "./quiz-session-panel.model";

const INTERACTIVE_FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

type QuizSessionQuestionProps = {
  locale: SupportedLocale;
  isSchoolMode: boolean;
  isCollectiveMode: boolean;
  showChoices: boolean;
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  currentQuestionState: CognitiveQuizStateId | null;
  currentQuestionReviewDate: string;
  selectedOption: string;
  selectedOptions: string[];
  showAnswer: boolean;
  questionFormatLabel: string;
  displayOptions: readonly string[];
  sourceIsExternal: boolean;
  collectiveRevealLabel: string;
  shouldHideChoices: boolean;
  onSelectOption: (option: string) => void;
  onToggleOption: (option: string) => void;
  onCheckAnswer: () => void;
  onRevealChoices?: () => void;
  onRevealAnswer?: () => void;
};

export function QuizSessionQuestion({
  locale,
  isSchoolMode,
  isCollectiveMode,
  showChoices,
  question,
  questionIndex,
  totalQuestions,
  currentQuestionState,
  currentQuestionReviewDate,
  selectedOption,
  selectedOptions,
  showAnswer,
  questionFormatLabel,
  displayOptions,
  sourceIsExternal,
  collectiveRevealLabel,
  shouldHideChoices,
  onSelectOption,
  onToggleOption,
  onCheckAnswer,
  onRevealChoices,
  onRevealAnswer,
}: QuizSessionQuestionProps) {
  return (
    <>
      <div className="relative z-10 mb-8 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <CognitiveSignalChip
            label={questionFormatLabel}
            tone={question.type === "flashcard" ? "emerald" : "violet"}
          />
          <CognitiveSignalChip label={question.category} tone="default" />
          {isSchoolMode ? (
            <CognitiveSignalChip
              label={isCollectiveMode
                ? getQuizUiCopy(locale, "session.collectiveChip")
                : getQuizUiCopy(locale, "session.individualChip")}
              tone="amber"
            />
          ) : currentQuestionState ? (
            <CognitiveSignalChip
              label={getQuizStateLabel(currentQuestionState, locale)}
              tone={STATE_TONES[currentQuestionState]}
            />
          ) : null}
        </div>

        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
          <span className="font-black text-slate-900">{questionIndex + 1}</span>
          <span className="opacity-30">/</span>
          <span>{totalQuestions}</span>
        </div>
      </div>

      {isSchoolMode ? (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-muted)] px-4 py-3">
          <CognitiveSignalChip label={isCollectiveMode ? "Vote collectif" : "Travail individuel"} tone="amber" />
          <span className="cmm-text-small cmm-text-secondary">
            {isCollectiveMode
              ? shouldHideChoices
                ? "Les réponses restent masquées jusqu’à l’affichage collectif."
                : "Votez puis révélez la bonne réponse après discussion."
              : "Répondez puis révélez la correction immédiatement."}
          </span>
        </div>
      ) : (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-muted)] px-4 py-3">
          <CognitiveSignalChip label="Prochaine révision" tone="default" />
          <span className="cmm-text-small cmm-text-secondary">{currentQuestionReviewDate}</span>
          <span className="ml-auto">
            <CognitiveSignalChip label="Questions mélangées" tone="cyan" />
          </span>
        </div>
      )}

      <p className={cn("mb-6 font-bold leading-relaxed text-slate-950", isSchoolMode ? "text-2xl md:text-3xl" : "text-xl")}>
        {getQuizLocalizedTextFallback(locale, question.localized?.question, question.question)}
      </p>

      {(question.sourceLabel || question.localized?.sourceLabel) ? (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-900">
          <span className="font-black uppercase tracking-[0.18em] text-sky-700">
            {getQuizUiCopy(locale, "session.sourceLabel")}
          </span>
          {sourceIsExternal && question.sourceUrl ? (
            <a
              href={question.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="font-bold text-sky-950 underline decoration-sky-300 underline-offset-2"
            >
              {getQuizLocalizedTextFallback(locale, question.localized?.sourceLabel, question.sourceLabel ?? "")}
            </a>
          ) : (
            <span className="font-bold text-sky-950">
              {getQuizLocalizedTextFallback(locale, question.localized?.sourceLabel, question.sourceLabel ?? "")}
            </span>
          )}
          <span className="rounded-full bg-white px-2 py-1 font-black uppercase tracking-[0.14em] text-sky-700">
            {question.sourceType}
          </span>
          <span className="rounded-full bg-white px-2 py-1 font-black uppercase tracking-[0.14em] text-sky-700">
            {question.confidenceLevel}
          </span>
          {question.isLocalRule ? (
            <span className="rounded-full bg-white px-2 py-1 font-black uppercase tracking-[0.14em] text-amber-700">
              {getQuizUiCopy(locale, "session.localRuleLabel")} {question.localScope}
            </span>
          ) : null}
          {question.needsReview ? (
            <span className="rounded-full bg-white px-2 py-1 font-black uppercase tracking-[0.14em] text-rose-700">
              {getQuizUiCopy(locale, "session.reviewedLabel")}
            </span>
          ) : null}
          {question.lastCheckedAt ? (
            <span className="ml-auto text-sky-900/70">
              {getQuizUiCopy(locale, "session.reviewedAtLabel")} {question.lastCheckedAt}
            </span>
          ) : null}
        </div>
      ) : null}

      {shouldHideChoices ? (
        <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm md:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 md:text-xs">
            {getQuizUiCopy(locale, "session.hiddenChoicesLabel")}
          </p>
          <p className="mt-2 text-lg font-semibold leading-relaxed text-amber-950">
            {getQuizUiCopy(locale, "session.school.promptHidden")}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {onRevealChoices && question.type !== "flashcard" ? (
              <button
                type="button"
                onClick={onRevealChoices}
                className={`${INTERACTIVE_FOCUS_RING} inline-flex items-center justify-center rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-amber-700`}
              >
                {getQuizUiCopy(locale, "session.school.revealChoices")}
              </button>
            ) : null}
            {onRevealAnswer ? (
              <button
                type="button"
                onClick={onRevealAnswer}
                className={`${INTERACTIVE_FOCUS_RING} inline-flex items-center justify-center rounded-2xl border border-amber-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-widest text-amber-900 transition hover:border-amber-300 hover:bg-amber-100`}
              >
                {getQuizUiCopy(locale, "session.school.revealAnswer")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {(question.type === "multiple-choice" || question.type === "multiple-select" || question.type === "true-false") && displayOptions.length > 0 ? (
        <div className="space-y-3">
          {displayOptions.map((option, index) => (
            <button
              type="button"
              key={index}
              onClick={() =>
                !showAnswer &&
                (question.type === "multiple-select" ? onToggleOption(option) : onSelectOption(option))
              }
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                isSchoolMode ? "min-h-16 px-5 py-5 text-lg" : "p-4",
                question.type === "multiple-select" && selectedOptions.includes(option)
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                  : selectedOption === option
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white hover:border-slate-300",
                showAnswer && "cursor-not-allowed opacity-60",
              )}
              disabled={showAnswer}
              aria-pressed={question.type === "multiple-select" ? selectedOptions.includes(option) : selectedOption === option}
            >
              {question.type === "multiple-select" ? (
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-black transition",
                    selectedOptions.includes(option)
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-300 bg-white text-transparent",
                  )}
                  aria-hidden="true"
                >
                  ✓
                </span>
              ) : null}
              <span>{option}</span>
            </button>
          ))}
        </div>
      ) : null}

      {isSchoolMode && isCollectiveMode && showChoices && !showAnswer ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {getQuizUiCopy(locale, "session.school.promptCollective")}
        </div>
      ) : null}

      {question.type === "flashcard" && !showAnswer && !shouldHideChoices ? (
        <div className="text-center">
          <button
            type="button"
            onClick={() =>
              onSelectOption(Array.isArray(question.answer) ? question.answer.join(", ") : question.answer)
            }
            className={`${INTERACTIVE_FOCUS_RING} rounded-xl bg-emerald-500 px-8 py-4 font-bold text-white transition-colors hover:bg-emerald-600`}
          >
            {getQuizUiCopy(locale, "session.school.revealAnswer")}
          </button>
        </div>
      ) : null}

      {(question.type === "multiple-choice" || question.type === "true-false") && selectedOption && !showAnswer ? (
        <button
          type="button"
          onClick={isSchoolMode && isCollectiveMode && onRevealAnswer ? onRevealAnswer : onCheckAnswer}
          className={`${INTERACTIVE_FOCUS_RING} mt-4 w-full rounded-xl bg-emerald-500 py-4 font-bold text-white transition-colors hover:bg-emerald-600 md:py-5`}
        >
          {collectiveRevealLabel}
        </button>
      ) : null}

      {question.type === "multiple-select" && selectedOptions.length > 0 && !showAnswer ? (
        <button
          type="button"
          onClick={isSchoolMode && isCollectiveMode && onRevealAnswer ? onRevealAnswer : onCheckAnswer}
          className={`${INTERACTIVE_FOCUS_RING} mt-4 w-full rounded-xl bg-emerald-500 py-4 font-bold text-white transition-colors hover:bg-emerald-600 md:py-5`}
        >
          {collectiveRevealLabel}
        </button>
      ) : null}

      {isSchoolMode && isCollectiveMode && !showAnswer && !selectedOption && selectedOptions.length === 0 && onRevealAnswer ? (
        <button
          type="button"
          onClick={onRevealAnswer}
          className={`${INTERACTIVE_FOCUS_RING} mt-4 w-full rounded-xl border border-amber-200 bg-amber-50 py-4 font-bold text-amber-900 transition-colors hover:border-amber-300 hover:bg-amber-100 md:py-5`}
        >
          {getQuizUiCopy(locale, "session.school.revealAnswer")}
        </button>
      ) : null}
    </>
  );
}
