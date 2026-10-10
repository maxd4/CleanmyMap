import { CheckCircle, GraduationCap, Lightbulb, XCircle } from "lucide-react";
import { CognitiveSignalChip } from "@/components/learn/cognitive-signal-chip";
import { getQuizUiCopy } from "@/lib/learning/quiz/quiz-i18n";
import type { QuizSessionSummary } from "@/lib/learning/quiz/quiz-session-types";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import type { ReactNode } from "react";

type QuizSessionPanelSummarySchoolProps = {
  locale: SupportedLocale;
  isCollectiveMode: boolean;
  schoolTrackLabel?: string;
  resolvedSchoolMessages: string[];
  schoolNotionLabels: string[];
  sessionSummary: QuizSessionSummary;
  sessionAccuracy: number;
  personalProgressView: ReactNode;
};

export function QuizSessionPanelSummarySchool({
  locale,
  isCollectiveMode,
  schoolTrackLabel,
  resolvedSchoolMessages,
  schoolNotionLabels,
  sessionSummary,
  sessionAccuracy,
  personalProgressView,
}: QuizSessionPanelSummarySchoolProps) {
  return (
    <>
      <div className="rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-left shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 md:text-xs">
            {getQuizUiCopy(locale, "session.school.bannerLabel")}
          </p>
          {isCollectiveMode ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-800">
              {getQuizUiCopy(locale, "session.school.collectiveBadge")}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm font-medium leading-relaxed text-amber-950/90">
          {schoolTrackLabel ? `Atelier de classe: ${schoolTrackLabel}. ` : ""}
          {isCollectiveMode
            ? getQuizUiCopy(locale, "session.school.promptCollective")
            : getQuizUiCopy(locale, "session.school.promptIndividual")}
        </p>
      </div>

      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <GraduationCap className="text-amber-600" size={32} aria-hidden="true" />
          <h2 className="text-4xl font-black cmm-text-primary tracking-tight md:text-5xl">
            Bilan de l’atelier
          </h2>
        </div>
        <p className="mx-auto max-w-3xl text-xl font-medium cmm-text-secondary">
          Une question, un vote, une discussion, puis une réponse courte à retenir.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <CognitiveSignalChip label={getQuizUiCopy(locale, "session.school.workshopTitle")} tone="amber" />
          <CognitiveSignalChip
            label={isCollectiveMode ? getQuizUiCopy(locale, "session.collectiveChip") : getQuizUiCopy(locale, "session.individualChip")}
            tone="violet"
          />
          <CognitiveSignalChip label={getQuizUiCopy(locale, "school.questionsLabel")} tone="cyan" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700 md:text-xs">
            {getQuizUiCopy(locale, "session.school.scoreLabel")}
          </p>
          <p className="mt-3 text-4xl font-black text-emerald-950">
            {sessionSummary.score}/{sessionSummary.totalQuestions}
          </p>
          <p className="mt-2 text-sm font-medium text-emerald-900/80">{sessionAccuracy}% de réussite</p>
        </div>
        <div className="rounded-[2rem] border border-sky-100 bg-sky-50 p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700 md:text-xs">
            {getQuizUiCopy(locale, "session.school.notionsLabel")}
          </p>
          {schoolNotionLabels.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm font-medium text-sky-950">
              {schoolNotionLabels.map((label) => (
                <li key={label} className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-sky-900/70">Aucune notion à afficher pour l’instant.</p>
          )}
        </div>
        <div className="rounded-[2rem] border border-violet-100 bg-violet-50 p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-700 md:text-xs">
            {getQuizUiCopy(locale, "session.school.errorsLabel")}
          </p>
          {sessionSummary.frequentErrorTypes.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm font-medium text-violet-950">
              {sessionSummary.frequentErrorTypes.map((item) => (
                <li key={item.label} className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-4 w-4 text-violet-600" aria-hidden="true" />
                  <span>
                    {item.label}
                    <span className="ml-2 text-xs text-violet-900/70">x{item.count}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-violet-900/70">Aucune erreur fréquente à signaler.</p>
          )}
        </div>
        <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 md:text-xs">
            {getQuizUiCopy(locale, "session.school.messagesLabel")}
          </p>
          <ul className="mt-3 space-y-2 text-sm font-medium text-amber-950">
            {resolvedSchoolMessages.slice(0, 3).map((message) => (
              <li key={message} className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-4 w-4 text-amber-600" aria-hidden="true" />
                <span>{message}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {personalProgressView}
    </>
  );
}
