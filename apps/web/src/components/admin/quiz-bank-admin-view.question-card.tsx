import Link from "next/link";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { SourceBadge } from "@/components/ui/page-structure";
import type { QuizBankAdminQuestion } from "@/lib/learning/quiz/quiz-bank-admin";
import {
  getDifficultyLabel,
  getQuestionTone,
  getShortText,
  getTrapLevelLabel,
  SOURCE_STATE_LABELS,
  SOURCE_STATE_TONES,
  SOURCE_TYPE_LABELS,
} from "./quiz-bank-admin-view.presentation";

export function QuestionCard({ question }: { question: QuizBankAdminQuestion }) {
  return (
    <CmmDisclosure
      id={question.id}
      tone={getQuestionTone(question)}
      size="lg"
      summary={
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge tone={getQuestionTone(question)}>{question.priorityLabel}</SourceBadge>
              <SourceBadge tone="slate">{question.categoryLabel}</SourceBadge>
              <SourceBadge tone="amber">{question.pedagogicalTypeLabel}</SourceBadge>
              <SourceBadge tone={SOURCE_STATE_TONES[question.sourceState]}>
                {SOURCE_STATE_LABELS[question.sourceState]}
              </SourceBadge>
            </div>
            <h3 className="text-lg font-black leading-snug text-stone-950">
              {question.question}
            </h3>
            <p className="max-w-4xl text-sm leading-6 text-stone-600">
              {getShortText(question.explanation, 220)}
            </p>
            <div className="flex flex-wrap gap-2">
              {question.accessTypeLabels.map((modeLabel) => (
                <SourceBadge key={modeLabel} tone="sky">
                  {modeLabel}
                </SourceBadge>
              ))}
              <SourceBadge tone="slate">Compétence {question.skillLabel}</SourceBadge>
              <SourceBadge tone="slate">Difficulté {getDifficultyLabel(question.difficulty)}</SourceBadge>
              <SourceBadge tone="slate">Piège {getTrapLevelLabel(question.trapLevel)}</SourceBadge>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 text-sm text-stone-500 lg:items-end">
            <span className="font-black uppercase tracking-[0.18em] text-stone-700">
              Priorité {question.priorityScore}
            </span>
            <span>{question.reviewReasons.length} signal{question.reviewReasons.length > 1 ? "s" : ""}</span>
            <span>{question.sourceFlags.length} alerte{question.sourceFlags.length > 1 ? "s" : ""} source</span>
          </div>
        </div>
      }
    >
      <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[1.25rem] border border-stone-200 bg-stone-50 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">
            Contenu
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Réponse attendue</dt>
              <dd className="mt-1 text-sm font-semibold text-stone-900">{question.answer}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Mode principal</dt>
              <dd className="mt-1 text-sm font-semibold text-stone-900">
                {question.accessTypeLabels.join(" · ")}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Rubrique</dt>
              <dd className="mt-1 text-sm font-semibold text-stone-900">
                <Link
                  href={question.reviewTargetHref}
                  className="underline decoration-stone-300 underline-offset-4 transition hover:decoration-stone-500"
                >
                  {question.reviewTargetLabel}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Compétence</dt>
              <dd className="mt-1 text-sm font-semibold text-stone-900">{question.skillLabel}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-6 text-stone-600">{question.explanation}</p>
        </section>

        <section className="space-y-4 rounded-[1.25rem] border border-stone-200 bg-white p-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">
              Traçabilité
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {question.sourceFlags.length > 0 ? (
                question.sourceFlags.map((flag) => (
                  <SourceBadge key={flag} tone={flag === "Sans source" ? "rose" : flag === "Source faible" ? "amber" : "slate"}>
                    {flag}
                  </SourceBadge>
                ))
              ) : (
                <SourceBadge tone="emerald">Source complète</SourceBadge>
              )}
            </div>
            <div className="mt-4 space-y-2 text-sm text-stone-600">
              <p>
                <span className="font-semibold text-stone-900">Source :</span>{" "}
                {question.sourceLabel ?? "Aucune source"}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Type :</span>{" "}
                {question.sourceType ? SOURCE_TYPE_LABELS[question.sourceType] : "n/a"}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Confiance :</span>{" "}
                {question.confidenceLevel ?? "n/a"}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Périmètre :</span>{" "}
                {question.localScope ?? "n/a"} {question.isLocalRule ? "(règle locale)" : ""}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Dernière vérification :</span>{" "}
                {question.lastCheckedAt ?? "n/a"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">
              Corrections suggérées
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
              {question.suggestions.length > 0 ? (
                question.suggestions.slice(0, 4).map((suggestion) => (
                  <li key={suggestion} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                    {suggestion}
                  </li>
                ))
              ) : (
                <li className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
                  Aucune correction bloquante.
                </li>
              )}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">
              Accroche pédagogique
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {question.reviewReasons.slice(0, 5).map((reason) => (
                <SourceBadge key={reason} tone="amber">
                  {reason}
                </SourceBadge>
              ))}
            </div>
          </div>
        </section>
      </div>
    </CmmDisclosure>
  );
}
