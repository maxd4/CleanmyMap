"use client";

import { useSearchParams } from "next/navigation";
import { DeferredEnvironmentalQuiz } from "@/components/learn/learn-deferred-panels";
import { parseQuizSentrainerEntryState } from "@/lib/learning/quiz/quiz-entry-state";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

export function LearnSentrainerQuizEntry({ locale }: { locale: LearnLocale }) {
  const searchParams = useSearchParams();

  return (
    <DeferredEnvironmentalQuiz
      locale={locale}
      {...parseQuizSentrainerEntryState(searchParams)}
    />
  );
}
