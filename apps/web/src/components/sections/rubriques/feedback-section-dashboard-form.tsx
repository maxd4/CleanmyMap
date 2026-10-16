"use client";

import { useState } from "react";
import { localize, type FeedbackSource, type Locale } from "./feedback-section.shared";
import { FeedbackSectionDashboardHeader } from "./feedback-section-dashboard-header";
import { QUESTIONNAIRES, type FeedbackType } from "./feedback/questionnaire-config";
import { QuestionnaireCard } from "./feedback/questionnaire-card";

export function FeedbackSectionDashboardForm({
  pagePath,
  locale,
  source,
  supportPrefill,
  initialType,
}: {
  pagePath: string;
  locale: Locale;
  source: FeedbackSource;
  supportPrefill: Partial<Record<string, string>> | null;
  initialType: FeedbackType;
}) {
  const [selectedType, setSelectedType] = useState<FeedbackType>(initialType);
  const selectedQuestionnaire =
    QUESTIONNAIRES.find((questionnaire) => questionnaire.id === selectedType) ??
    QUESTIONNAIRES[0];

  function selectQuestionnaire(type: FeedbackType) {
    setSelectedType(type);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("type", type);
      url.hash = type;
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }

  return (
    <>
      <FeedbackSectionDashboardHeader fr={locale === "fr"} />

      <section
        id="bug"
        className="rounded-[2.2rem] border border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,248,250,0.99)_100%)] p-6 shadow-[0_28px_80px_-64px_rgba(236,72,153,0.6)]"
      >
        <div className="space-y-4">
          <div>
            <h2 className="text-[0.9rem] font-black uppercase tracking-[0.18em] text-pink-600">
              {locale === "fr" ? "Quel est votre retour ?" : "What is your feedback?"}
            </h2>
            <p className="mt-2 text-[0.96rem] leading-[1.65] text-slate-600">
              {locale === "fr"
                ? "Choisissez le parcours qui correspond le mieux à votre message."
                : "Choose the path that best matches your message."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={locale === "fr" ? "Type de retour" : "Feedback type"}>
            {QUESTIONNAIRES.map((questionnaire) => {
              const Icon = questionnaire.icon;
              const isSelected = questionnaire.id === selectedType;

              return (
                <button
                  key={questionnaire.id}
                  id={questionnaire.id === "bug" ? undefined : questionnaire.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => selectQuestionnaire(questionnaire.id)}
                  className={[
                    "flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400",
                    isSelected
                      ? "border-pink-500 bg-pink-500 text-white shadow-[0_18px_32px_-20px_rgba(236,72,153,0.65)]"
                      : "border-rose-200 bg-white text-slate-700 hover:border-pink-300 hover:bg-pink-50",
                  ].join(" ")}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-bold">
                      {localize(locale, questionnaire.title)}
                    </span>
                    <span
                      className={[
                        "mt-1 block text-xs leading-relaxed",
                        isSelected ? "text-white/85" : "text-slate-500",
                      ].join(" ")}
                    >
                      {localize(locale, questionnaire.intro)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <QuestionnaireCard
            key={`${selectedQuestionnaire.id}:${
              selectedQuestionnaire.id === "bug"
                ? JSON.stringify(supportPrefill ?? null)
                : "no-prefill"
            }`}
            questionnaire={selectedQuestionnaire}
            pagePath={pagePath}
            source={source}
            initialValues={
              selectedQuestionnaire.id === "bug"
                ? supportPrefill ?? undefined
                : undefined
            }
          />
        </div>
      </section>
    </>
  );
}
