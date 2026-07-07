import Link from "next/link";
import dynamic from "next/dynamic";
import { GraduationCap, Lightbulb, Trophy, XCircle, CheckCircle, ArrowRight } from "lucide-react";
import { CognitiveSignalChip } from "@/components/learn/cognitive-signal-chip";
import { getQuizReviewFollowUp } from "@/components/learn/quiz-review-targets";
import { getQuizErrorFollowUp } from "@/components/learn/quiz-error-grid";
import type { QuizErrorTypeId } from "@/components/learn/quiz-error-grid";
import { getQuizUiCopy } from "@/lib/learning/quiz-i18n";
import type { QuizSessionSummary } from "@/components/learn/environmental-quiz";
import type { QuizPersonalProgressSnapshot } from "@/lib/learning/quiz-personal-progress";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import { getSessionAccuracy } from "./quiz-session-panel.helpers";

const QuizPersonalProgressOverviewLazy = dynamic(
  () =>
    import("@/components/learn/quiz-personal-progress-overview").then(
      (module) => module.QuizPersonalProgressOverview,
    ),
  { ssr: false, loading: () => null },
);

type QuizSessionPanelSummaryProps = {
  locale: SupportedLocale;
  isSchoolMode: boolean;
  isCollectiveMode: boolean;
  schoolTrackLabel?: string;
  schoolKeyMessages?: string[];
  sessionSummary: QuizSessionSummary;
  personalProgress?: QuizPersonalProgressSnapshot | null;
  onResetQuiz: () => void;
  onReplayRecommendedMode: () => void;
};

export function QuizSessionPanelSummary({
  locale,
  isSchoolMode,
  isCollectiveMode,
  schoolTrackLabel,
  schoolKeyMessages,
  sessionSummary,
  personalProgress,
  onResetQuiz,
  onReplayRecommendedMode,
}: QuizSessionPanelSummaryProps) {
  const sessionAccuracy = getSessionAccuracy(sessionSummary);
  const nextReviewTarget = sessionSummary.recommendedLearningTarget ?? sessionSummary.nextReviewTarget;
  const recommendedMode = sessionSummary.recommendedMode;
  const schoolNotionLabels = Array.from(
    new Map([...sessionSummary.themesSucceeded, ...sessionSummary.themesToReview].map((theme) => [theme.href, theme] as const)).values(),
  ).map((theme) => theme.label);
  const fallbackSchoolMessages = [
    "On vote d'abord, puis on explique.",
    "La réponse se discute avant d'être révélée.",
    "Le bon réflexe dépend souvent du contexte.",
  ];
  const resolvedSchoolMessages = schoolKeyMessages && schoolKeyMessages.length > 0 ? schoolKeyMessages : fallbackSchoolMessages;

  if (isSchoolMode) {
    return (
      <div className="space-y-8">
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

        {personalProgress ? (
          <QuizPersonalProgressOverviewLazy locale={locale} snapshot={personalProgress} />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-violet-100 bg-violet-50 p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-700 md:text-xs">
              {getQuizUiCopy(locale, "session.errorTypesLabel")}
            </p>
            {sessionSummary.frequentErrorTypes.length > 0 ? (
              <div className="mt-4 space-y-3">
                {sessionSummary.frequentErrorTypes.map((item) => {
                  const followUp = getQuizErrorFollowUp(item.label as QuizErrorTypeId);
                  return (
                    <div key={item.label} className="rounded-2xl border border-violet-100 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-violet-950">{item.label}</p>
                          <p className="mt-1 text-xs text-violet-900/70">
                            {item.count} occurrence{item.count > 1 ? "s" : ""}
                          </p>
                        </div>
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-700">
                          {getQuizUiCopy(locale, "session.school.revisionLabel")}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-700">{followUp.reason}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">
                          {getQuizUiCopy(locale, "session.school.recommendedModeLabel")} : {followUp.modeLabel}
                        </span>
                        <Link
                          href={followUp.href}
                          className="inline-flex items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-violet-900 transition hover:border-violet-300 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:ring-offset-violet-50"
                        >
                          {getQuizUiCopy(locale, "session.school.revisionLabel")}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-violet-900/70">
                {getQuizUiCopy(locale, "session.errorTypesLabel")}
              </p>
            )}
          </div>

          <div className="rounded-[2rem] border border-sky-100 bg-sky-50 p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700 md:text-xs">
              {getQuizUiCopy(locale, "session.school.masteredSkillsLabel")}
            </p>
            {recommendedMode ? (
              <div className="mt-3 space-y-4">
                <div>
                  <p className="text-2xl font-black text-sky-950">{recommendedMode.label}</p>
                  <p className="mt-2 text-sm text-sky-900/80">{recommendedMode.reason}</p>
                </div>
                <button
                  type="button"
                  onClick={onReplayRecommendedMode}
                  className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700"
                >
                  {getQuizUiCopy(locale, "session.replaySession")}
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-sky-900/70">Aucun mode recommandé pour l’instant.</p>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 md:text-xs">Reprise ciblée</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight cmm-text-primary">
                {nextReviewTarget ? nextReviewTarget.label : "Reprendre la session"}
              </h3>
              <p className="mt-2 text-sm cmm-text-secondary">
                {nextReviewTarget
                  ? "Repars sur la rubrique la plus fragile pour consolider la notion là où l’erreur est apparue."
                  : "Recommence la session pour refaire un cycle complet."}
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              {nextReviewTarget ? (
                <Link
                  href={nextReviewTarget.href}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                >
                  Revoir la rubrique d&apos;apprentissage
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : null}
              <button
                type="button"
                onClick={onResetQuiz}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black uppercase tracking-widest text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                Recommencer
              </button>
            </div>
          </div>
        </div>

        {nextReviewTarget ? (
          <p className="text-center text-sm cmm-text-secondary">
            La reprise ciblée t&apos;envoie directement vers <span className="font-bold">{nextReviewTarget.label}</span>.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Trophy className="text-violet-600" size={32} aria-hidden="true" />
          <h2 className="text-3xl font-black cmm-text-primary tracking-tight">
            {getQuizUiCopy(locale, "session.sessionTitle")}
          </h2>
        </div>
        <p className="text-lg cmm-text-secondary max-w-2xl mx-auto font-medium">
          Le bilan relie vos erreurs à la bonne rubrique pour fermer la boucle d&apos;apprentissage.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
            {getQuizUiCopy(locale, "session.modeToReplayLabel")}
          </p>
          {sessionSummary.themesSucceeded.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm font-medium text-sky-950">
              {sessionSummary.themesSucceeded.map((theme) => (
                <li key={theme.href} className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <span>{theme.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-sky-900/70">Aucune compétence totalement maîtrisée pour l’instant.</p>
          )}
        </div>
        <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 md:text-xs">
            {getQuizUiCopy(locale, "session.school.skillsToReviewLabel")}
          </p>
          {sessionSummary.themesToReview.length > 0 ? (
            <div className="mt-3 space-y-3">
              {sessionSummary.themesToReview.map((theme) => {
                const followUp = getQuizReviewFollowUp(theme);
                return (
                  <div key={theme.href} className="rounded-2xl border border-amber-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-amber-950">{theme.label}</p>
                        <p className="mt-1 text-xs text-amber-900/70">
                          {theme.correct}/{theme.total} réponses justes
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                        {getQuizUiCopy(locale, "session.school.revisionLabel")}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-700">{followUp.reason}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">
                        {getQuizUiCopy(locale, "session.school.recommendedModeLabel")} : {followUp.modeLabel}
                      </span>
                      <Link
                        href={theme.href}
                        className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-amber-900 transition hover:border-amber-300 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50"
                      >
                        {getQuizUiCopy(locale, "session.school.revisionLabel")}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-amber-900/70">
              {getQuizUiCopy(locale, "session.school.revisionLabel")}
            </p>
          )}
        </div>
      </div>

      {personalProgress ? <QuizPersonalProgressOverviewLazy locale={locale} snapshot={personalProgress} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-violet-100 bg-violet-50 p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-700 md:text-xs">
            {getQuizUiCopy(locale, "session.errorTypesLabel")}
          </p>
          {sessionSummary.frequentErrorTypes.length > 0 ? (
            <div className="mt-4 space-y-3">
              {sessionSummary.frequentErrorTypes.map((item) => {
                const followUp = getQuizErrorFollowUp(item.label as QuizErrorTypeId);
                return (
                  <div key={item.label} className="rounded-2xl border border-violet-100 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-violet-950">{item.label}</p>
                        <p className="mt-1 text-xs text-violet-900/70">
                          {item.count} occurrence{item.count > 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-violet-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-700">
                        {getQuizUiCopy(locale, "session.school.revisionLabel")}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-700">{followUp.reason}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">
                        {getQuizUiCopy(locale, "session.school.recommendedModeLabel")} : {followUp.modeLabel}
                      </span>
                      <Link
                        href={followUp.href}
                        className="inline-flex items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-violet-900 transition hover:border-violet-300 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:ring-offset-violet-50"
                      >
                        {getQuizUiCopy(locale, "session.school.revisionLabel")}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-violet-900/70">
              {getQuizUiCopy(locale, "session.errorTypesLabel")}
            </p>
          )}
        </div>
        <div className="rounded-[2rem] border border-sky-100 bg-sky-50 p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700 md:text-xs">
            {getQuizUiCopy(locale, "session.school.masteredSkillsLabel")}
          </p>
          {recommendedMode ? (
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-2xl font-black text-sky-950">{recommendedMode.label}</p>
                <p className="mt-2 text-sm text-sky-900/80">{recommendedMode.reason}</p>
              </div>
              <button
                type="button"
                onClick={onReplayRecommendedMode}
                className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700"
              >
                {getQuizUiCopy(locale, "session.replaySession")}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-sky-900/70">Aucun mode recommandé pour l’instant.</p>
          )}
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 md:text-xs">Reprise ciblée</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight cmm-text-primary">
              {nextReviewTarget ? nextReviewTarget.label : "Reprendre la session"}
            </h3>
            <p className="mt-2 text-sm cmm-text-secondary">
              {nextReviewTarget
                ? "Repars sur la rubrique la plus fragile pour consolider la notion là où l’erreur est apparue."
                : "Recommence la session pour refaire un cycle complet."}
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            {nextReviewTarget ? (
              <Link
                href={nextReviewTarget.href}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
              >
                Revoir la rubrique d&apos;apprentissage
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onResetQuiz}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black uppercase tracking-widest text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Recommencer
            </button>
          </div>
        </div>
      </div>

      {nextReviewTarget ? (
        <p className="text-center text-sm cmm-text-secondary">
          La reprise ciblée t&apos;envoie directement vers <span className="font-bold">{nextReviewTarget.label}</span>.
        </p>
      ) : null}
    </div>
  );
}
