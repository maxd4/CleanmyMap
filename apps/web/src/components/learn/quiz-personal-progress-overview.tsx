"use client";

import Link from "next/link";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import type { QuizPersonalProgressSnapshot } from "@/lib/learning/quiz-personal-progress";
import { cn } from "@/lib/utils";

type QuizPersonalProgressOverviewProps = {
  locale: SupportedLocale;
  snapshot: QuizPersonalProgressSnapshot | null;
  density?: "compact" | "full";
};

function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function QuizPersonalProgressOverview({
  locale,
  snapshot,
  density = "full",
}: QuizPersonalProgressOverviewProps) {
  if (!snapshot) {
    return null;
  }

  const modeStats = density === "compact" ? snapshot.modeStats.slice(0, 2) : snapshot.modeStats.slice(0, 4);
  const masteredSkills = density === "compact" ? snapshot.masteredSkills.slice(0, 1) : snapshot.masteredSkills.slice(0, 3);
  const skillsToReview = density === "compact" ? snapshot.skillsToReview.slice(0, 1) : snapshot.skillsToReview.slice(0, 3);
  const errorStats = density === "compact" ? snapshot.errorStats.slice(0, 2) : snapshot.errorStats.slice(0, 4);
  const reviewTargets = density === "compact" ? snapshot.reviewTargets.slice(0, 2) : snapshot.reviewTargets.slice(0, 4);
  const heading =
    locale === "fr" ? "Progression personnelle" : "Personal progress";
  const subtitle =
    locale === "fr"
      ? "Le suivi accumule les sessions pour t'indiquer ce que tu maîtrises déjà et ce qu'il faut revoir."
      : "The tracker accumulates sessions to show what you already master and what to review.";

  return (
    <section className={cn("rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-sm", density === "full" && "p-6")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{heading}</p>
          <p className="mt-2 text-sm font-medium text-slate-600">{subtitle}</p>
        </div>
        {snapshot.recommendedMode ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
              {locale === "fr" ? "Prochain mode recommandé" : "Next recommended mode"}
            </p>
            <p className="mt-1 text-base font-black text-emerald-950">{snapshot.recommendedMode.label}</p>
            <p className="mt-1 max-w-sm text-xs font-medium text-emerald-900/80">{snapshot.recommendedMode.reason}</p>
          </div>
        ) : null}
      </div>

      <div className={cn("mt-5 grid gap-4", density === "compact" ? "md:grid-cols-2" : "lg:grid-cols-2")}>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {locale === "fr" ? "Scores par mode" : "Scores by mode"}
          </p>
          <div className="mt-3 space-y-3">
            {modeStats.length > 0 ? (
              modeStats.map((mode) => (
                <div key={mode.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950">{mode.label}</p>
                    <p className="text-xs text-slate-500">
                      {mode.sessions} session{mode.sessions > 1 ? "s" : ""} {locale === "fr" ? "•" : "•"}{" "}
                      {mode.correctAnswers}/{mode.totalQuestions}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                    {formatPercentage(mode.accuracy)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                {locale === "fr" ? "Aucun score enregistré pour le moment." : "No score recorded yet."}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {locale === "fr" ? "Compétences travaillées" : "Practiced skills"}
          </p>
          <div className="mt-3 space-y-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                {locale === "fr" ? "Bien installées" : "Well established"}
              </p>
              <div className="mt-2 space-y-2">
                {masteredSkills.length > 0 ? (
                  masteredSkills.map((skill) => (
                    <div key={skill.label} className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-950">{skill.label}</p>
                      <span className="text-xs font-black text-emerald-700">
                        {formatPercentage(skill.accuracy)} {locale === "fr" ? "sur" : "over"} {skill.attempts}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    {locale === "fr" ? "Pas encore de compétence consolidée." : "No consolidated skill yet."}
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                {locale === "fr" ? "À consolider" : "To consolidate"}
              </p>
              <div className="mt-2 space-y-2">
                {skillsToReview.length > 0 ? (
                  skillsToReview.map((skill) => (
                    <div key={skill.label} className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-950">{skill.label}</p>
                      <span className="text-xs font-black text-amber-700">
                        {formatPercentage(skill.accuracy)} {locale === "fr" ? "sur" : "over"} {skill.attempts}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    {locale === "fr" ? "Aucune compétence fragile pour l’instant." : "No weak skill for now."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {density === "full" ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {locale === "fr" ? "Erreurs fréquentes" : "Frequent mistakes"}
              </p>
              <div className="mt-3 space-y-2">
                {errorStats.length > 0 ? (
                  errorStats.map((error) => (
                    <div key={error.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <span className="text-sm font-semibold text-slate-950">{error.label}</span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-700">
                        {error.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    {locale === "fr" ? "Aucune erreur récurrente enregistrée." : "No recurring error recorded."}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {locale === "fr" ? "Rubriques associées" : "Related learning sections"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {reviewTargets.length > 0 ? (
                  reviewTargets.map((target) => (
                    <Link
                      key={target.href}
                      href={target.href}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-100"
                    >
                      <span>{target.label}</span>
                      <span className="text-xs font-black text-sky-700">{formatPercentage(target.accuracy)}</span>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    {locale === "fr" ? "Aucune rubrique prioritaire à ce stade." : "No priority section yet."}
                  </p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {density === "compact" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {errorStats.length > 0 ? (
            errorStats.slice(0, 2).map((error) => (
              <span
                key={error.label}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                {error.label}
                <span className="font-black text-slate-500">{error.count}</span>
              </span>
            ))
          ) : null}
          {reviewTargets.length > 0 ? (
            reviewTargets.slice(0, 2).map((target) => (
              <Link
                key={target.href}
                href={target.href}
                className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-100"
              >
                {target.label}
              </Link>
            ))
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
