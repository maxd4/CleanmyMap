"use client";

import { type ComponentProps } from "react";
import { Zap } from "lucide-react";
import { QuizAccessPicker } from "@/components/learn/quiz/quiz-access-picker";
import { QuizReasoningPicker } from "@/components/learn/quiz/quiz-reasoning-picker";
import { QuizSchoolPicker } from "@/components/learn/quiz/school/quiz-school-picker";
import { QuizSchoolWorkshopSession } from "@/components/learn/quiz/school/quiz-school-workshop-session";
import { QuizSessionPanel } from "@/components/learn/quiz/quiz-session-panel";
import { getQuizUiCopy } from "@/lib/learning/quiz/quiz-i18n";
import type { QuizPersonalProgressSnapshot } from "@/lib/learning/quiz/quiz-personal-progress";
import type { QuizAccessTypeId } from "@/lib/learning/quiz/quiz-access-types";
import type { QuizReasoningType } from "@/lib/learning/quiz/quiz-reasoning-types";
import type { QuizTrapLevelId } from "@/lib/learning/quiz/quiz-trap-levels";
import type { QuizSchoolFormat, QuizSchoolLevel } from "@/lib/learning/quiz/school/quiz-school-types";
import type { QuizQuestion } from "@/lib/learning/quiz/quiz-question-contract";
import type { QuizSessionSummary } from "@/lib/learning/quiz/quiz-session-types";
import type { Locale } from "@/lib/ui/preferences";
import type { CognitiveQuizSummary } from "@/lib/learning/cognitive-principles";

type ViewProps = {
  locale: Locale; isDemoMode: boolean; selectedAccessType: QuizAccessTypeId | null; selectedTrapLevel: QuizTrapLevelId | null; selectedReasoningType: QuizReasoningType | null; selectedSchoolLevel: QuizSchoolLevel | null; selectedSchoolFormat: QuizSchoolFormat; isSchoolCollectiveMode: boolean; loading: boolean; demoQuestions: QuizQuestion[]; schoolQuestions: QuizQuestion[]; filteredQuestions: QuizQuestion[]; availableReasoningTypes: QuizReasoningType[]; quizSummary: CognitiveQuizSummary; personalProgress: QuizPersonalProgressSnapshot | null; activeSessionQuestions: QuizQuestion[]; question: QuizQuestion | undefined; currentQuestionIdx: number; currentQuestionState: ComponentProps<typeof QuizSessionPanel>["currentQuestionState"]; currentQuestionReviewDate: string; currentQuestionStreak: number; currentQuestionMasteryLevel: number; selectedOption: string; selectedOptions: string[]; showAnswer: boolean; showQuestionChoices: boolean; lastCheckResult: boolean | null; score: number; shouldOfferMiniChallenge: boolean; nextReasoningType: QuizReasoningType | null; currentQuestionSeenToday: boolean; sessionSummary: QuizSessionSummary | null; onSelectOption: ComponentProps<typeof QuizSessionPanel>["onSelectOption"]; onToggleOption: ComponentProps<typeof QuizSessionPanel>["onToggleOption"]; onCheckAnswer: ComponentProps<typeof QuizSessionPanel>["onCheckAnswer"]; onRevealChoices: ComponentProps<typeof QuizSessionPanel>["onRevealChoices"]; onRevealAnswer: ComponentProps<typeof QuizSessionPanel>["onRevealAnswer"]; onPreviousQuestion: ComponentProps<typeof QuizSessionPanel>["onPreviousQuestion"]; onNextQuestion: ComponentProps<typeof QuizSessionPanel>["onNextQuestion"]; onResetQuiz: () => void; onStartMiniChallenge: () => void; onReplayRecommendedMode: () => void; onHandleSRSUpdate: ComponentProps<typeof QuizSessionPanel>["onHandleSRSUpdate"]; onSelectTrapLevel: (level: QuizTrapLevelId | null) => void; onSelectAccessType: (type: QuizAccessTypeId) => void; onStartDemoMode: () => void; onSelectReasoningType: (type: QuizReasoningType | null) => void; onBackToAccessType: () => void; onToggleCollectiveMode: () => void; onLaunchSchoolSession: (level: QuizSchoolLevel, format: QuizSchoolFormat) => void; onRestartSchoolWorkshop: () => void; onChooseSchoolFormat: () => void;
};

function LoadingQuiz({ copy }: { copy: string }) { return <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4"><Zap className="animate-pulse text-emerald-500" size={48} /><p className="cmm-text-secondary font-medium italic">{copy}</p></div>; }
function EmptyQuiz({ locale, onChangeReasoning, onChangeType }: { locale: Locale; onChangeReasoning: () => void; onChangeType: () => void }) { return <div className="flex min-h-[400px] flex-col items-center justify-center gap-4"><Zap className="animate-pulse text-emerald-500" size={48} /><p className="font-medium italic cmm-text-secondary">{getQuizUiCopy(locale, "session.noQuestion")}</p><div className="flex flex-wrap items-center justify-center gap-3"><button onClick={onChangeReasoning} className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-muted)] px-4 py-2 font-semibold cmm-text-primary">{getQuizUiCopy(locale, "session.changeReasoning")}</button><button onClick={onChangeType} className="rounded-xl border border-[color:var(--border-default)] bg-white px-4 py-2 font-semibold cmm-text-primary">{getQuizUiCopy(locale, "session.changeType")}</button></div></div>; }

function shouldShowInitialLoading(props: ViewProps) {
  const { isDemoMode, selectedAccessType, selectedSchoolFormat, loading, demoQuestions, schoolQuestions, filteredQuestions } = props;
  const hasInitialSession = (isDemoMode && demoQuestions.length > 0) || (selectedAccessType === "ecole" && selectedSchoolFormat !== "atelier-60" && schoolQuestions.length > 0) || (!isDemoMode && selectedAccessType !== "ecole" && !loading && filteredQuestions.length > 0);
  return Boolean((selectedAccessType === "mixte" || props.selectedReasoningType || isDemoMode || selectedAccessType === "ecole") && !props.question && hasInitialSession);
}

function getLoadingCopy(props: ViewProps) {
  if (props.isDemoMode) return getQuizUiCopy(props.locale, "session.loadingDemo");
  if (props.selectedAccessType === "ecole") return getQuizUiCopy(props.locale, "session.loadingSchool");
  return getQuizUiCopy(props.locale, "session.loadingAdaptive");
}

function QuizSessionContent(props: ViewProps) {
  const { locale, isDemoMode, selectedAccessType, selectedSchoolLevel, isSchoolCollectiveMode, showQuestionChoices, selectedOption, selectedOptions, showAnswer, lastCheckResult, score, shouldOfferMiniChallenge, nextReasoningType, currentQuestionSeenToday, sessionSummary, personalProgress, activeSessionQuestions, question, currentQuestionIdx, currentQuestionState, currentQuestionReviewDate, currentQuestionStreak, currentQuestionMasteryLevel, onSelectOption, onToggleOption, onCheckAnswer, onRevealChoices, onRevealAnswer, onPreviousQuestion, onNextQuestion, onResetQuiz, onStartMiniChallenge, onReplayRecommendedMode, onHandleSRSUpdate } = props;
  return <QuizSessionPanel locale={locale} isSchoolMode={selectedAccessType === "ecole"} isCollectiveMode={isSchoolCollectiveMode} showChoices={selectedAccessType === "ecole" ? (isSchoolCollectiveMode ? showQuestionChoices : true) : true} schoolTrackLabel={selectedSchoolLevel ? `${getQuizUiCopy(locale, "school.levelChip")} ${selectedSchoolLevel}` : undefined} question={question!} questionIndex={currentQuestionIdx} totalQuestions={activeSessionQuestions.length} currentQuestionState={currentQuestionState} currentQuestionReviewDate={currentQuestionReviewDate} currentQuestionStreak={currentQuestionStreak} currentQuestionMasteryLevel={currentQuestionMasteryLevel} selectedOption={selectedOption} selectedOptions={selectedOptions} showAnswer={showAnswer} lastCheckResult={lastCheckResult} score={score} shouldOfferMiniChallenge={shouldOfferMiniChallenge} nextReasoningType={nextReasoningType} hasReviewedToday={isDemoMode || selectedAccessType === "ecole" || currentQuestionSeenToday} sessionSummary={sessionSummary} personalProgress={isDemoMode ? null : personalProgress} onSelectOption={onSelectOption} onToggleOption={onToggleOption} onCheckAnswer={onCheckAnswer} onRevealChoices={selectedAccessType === "ecole" ? onRevealChoices : undefined} onRevealAnswer={selectedAccessType === "ecole" ? onRevealAnswer : undefined} onPreviousQuestion={onPreviousQuestion} onNextQuestion={onNextQuestion} onResetQuiz={onResetQuiz} onStartMiniChallenge={onStartMiniChallenge} onReplayRecommendedMode={onReplayRecommendedMode} onHandleSRSUpdate={onHandleSRSUpdate} isDemoMode={isDemoMode} />;
}

function QuizSelectionContent(props: ViewProps) {
  const { locale, selectedAccessType, selectedTrapLevel, selectedSchoolLevel, selectedSchoolFormat, isSchoolCollectiveMode, isDemoMode, personalProgress, quizSummary, availableReasoningTypes, schoolQuestions, onSelectTrapLevel, onSelectAccessType, onStartDemoMode, onToggleCollectiveMode, onLaunchSchoolSession, onBackToAccessType, onRestartSchoolWorkshop, onChooseSchoolFormat, selectedReasoningType, onSelectReasoningType } = props;
  if (!selectedAccessType) return <QuizAccessPicker locale={locale} selectedTrapLevel={selectedTrapLevel} personalProgress={isDemoMode ? null : personalProgress} onSelectTrapLevel={onSelectTrapLevel} onSelectAccessType={onSelectAccessType} onStartDemoMode={onStartDemoMode} />;
  if (selectedAccessType === "ecole" && !selectedSchoolLevel) return <QuizSchoolPicker locale={locale} collectiveMode={isSchoolCollectiveMode} onToggleCollectiveMode={onToggleCollectiveMode} onLaunchSchoolSession={onLaunchSchoolSession} onBackToAccessType={onBackToAccessType} />;
  if (selectedAccessType === "ecole" && selectedSchoolLevel && selectedSchoolFormat === "atelier-60") return <QuizSchoolWorkshopSession locale={locale} level={selectedSchoolLevel} questions={schoolQuestions} onRestart={onRestartSchoolWorkshop} onChooseFormat={onChooseSchoolFormat} />;
  if (selectedAccessType !== "mixte" && !selectedReasoningType) return <QuizReasoningPicker locale={locale} quizSummary={quizSummary} onSelectReasoningType={onSelectReasoningType} onBackToAccessType={onBackToAccessType} availableReasoningTypes={availableReasoningTypes} />;
  if (!props.question) return <EmptyQuiz locale={locale} onChangeReasoning={() => onSelectReasoningType(null)} onChangeType={onBackToAccessType} />;
  return <QuizSessionContent {...props} />;
}

export function EnvironmentalQuizView(props: ViewProps) {
  const { locale, isDemoMode, selectedAccessType, loading } = props;
  if (shouldShowInitialLoading(props)) return <LoadingQuiz copy={getLoadingCopy(props)} />;
  if (loading && selectedAccessType && selectedAccessType !== "ecole" && !isDemoMode) return <LoadingQuiz copy={getQuizUiCopy(locale, "session.loadingAdaptive")} />;
  return <QuizSelectionContent {...props} />;
}
