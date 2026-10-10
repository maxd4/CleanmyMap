import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import type { QuizPersonalProgressSnapshot } from "@/lib/learning/quiz/quiz-personal-progress";
import type { QuizSessionSummary } from "@/lib/learning/quiz/quiz-session-types";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import { getSessionAccuracy } from "./quiz-session-panel.helpers";
import { QuizSessionPanelSummaryPersonal } from "./quiz-session-panel-summary-personal";
import { QuizSessionPanelSummaryRestart } from "./quiz-session-panel-summary-restart";
import { QuizSessionPanelSummaryReview } from "./quiz-session-panel-summary-review";
import { QuizSessionPanelSummarySchool } from "./quiz-session-panel-summary-school";

const QuizPersonalProgressOverviewLazy = dynamic(
  () =>
    import("@/components/learn/quiz/quiz-personal-progress-overview").then(
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

const FALLBACK_SCHOOL_MESSAGES = [
  "On vote d'abord, puis on explique.",
  "La réponse se discute avant d'être révélée.",
  "Le bon réflexe dépend souvent du contexte.",
];

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
  const resolvedSchoolMessages = schoolKeyMessages && schoolKeyMessages.length > 0 ? schoolKeyMessages : FALLBACK_SCHOOL_MESSAGES;
  const personalProgressView: ReactNode = personalProgress ? (
    <QuizPersonalProgressOverviewLazy locale={locale} snapshot={personalProgress} />
  ) : null;

  return (
    <div className="space-y-8">
      {isSchoolMode ? (
        <QuizSessionPanelSummarySchool
          locale={locale}
          isCollectiveMode={isCollectiveMode}
          schoolTrackLabel={schoolTrackLabel}
          resolvedSchoolMessages={resolvedSchoolMessages}
          schoolNotionLabels={schoolNotionLabels}
          sessionSummary={sessionSummary}
          sessionAccuracy={sessionAccuracy}
          personalProgressView={personalProgressView}
        />
      ) : (
        <QuizSessionPanelSummaryPersonal
          locale={locale}
          sessionSummary={sessionSummary}
          sessionAccuracy={sessionAccuracy}
          personalProgressView={personalProgressView}
        />
      )}

      <QuizSessionPanelSummaryReview
        locale={locale}
        sessionSummary={sessionSummary}
        recommendedMode={recommendedMode}
        onReplayRecommendedMode={onReplayRecommendedMode}
      />
      <QuizSessionPanelSummaryRestart nextReviewTarget={nextReviewTarget} onResetQuiz={onResetQuiz} />
    </div>
  );
}
