"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, RotateCcw, ShieldAlert } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/admin-dashboard-ui";
import { SourceBadge, StatCard } from "@/components/ui/page-structure";
import { cn } from "@/lib/utils";
import {
  QUIZ_ACCESS_TYPES,
  getQuizAccessType,
  type QuizAccessTypeId,
} from "@/components/learn/quiz-access-types";
import { QUIZ_TRAP_LEVELS } from "@/components/learn/quiz-trap-levels";
import {
  QUIZ_DIFFICULTY_PRIORITY,
  QUIZ_PEDAGOGICAL_TYPE_PRIORITY,
  getQuizPedagogicalTypeLabel,
  type QuizDifficultyId,
  type QuizPedagogicalTypeId,
} from "@/lib/learning/quiz-taxonomy";
import type { QuizReasoningType } from "@/components/learn/quiz-reasoning-types";
import type { QuizSourceType } from "@/lib/learning/quiz-source-metadata";
import type {
  QuizBankAdminFilters,
  QuizBankAdminQuestion,
  QuizBankAdminSnapshot,
  QuizBankSourceState,
} from "@/lib/learning/quiz-bank-admin";

const DEFAULT_FILTERS: QuizBankAdminFilters = {
  mode: "all",
  pedagogicalType: "all",
  skill: "all",
  difficulty: "all",
  trapLevel: "all",
  sourceType: "all",
  sourceState: "all",
  needsReview: "all",
};

const SOURCE_TYPE_LABELS: Record<QuizSourceType, string> = {
  institutionnelle: "Institutionnelle",
  scientifique: "Scientifique",
  associative: "Associative",
  presse: "Presse",
  interne: "Interne",
  estimation: "Estimation",
};

const SOURCE_STATE_LABELS: Record<QuizBankSourceState, string> = {
  missing: "Sans source",
  weak: "Source faible",
  sourced: "Source documentée",
};

const SOURCE_STATE_TONES: Record<QuizBankSourceState, "rose" | "amber" | "emerald"> = {
  missing: "rose",
  weak: "amber",
  sourced: "emerald",
};

const REASONING_TYPE_LABELS: Record<QuizReasoningType, string> = {
  "idée reçue": "Idée reçue",
  terrain: "Terrain",
  estimation: "Estimation",
  comparaison: "Comparaison",
  "conséquences indirectes": "Conséquences indirectes",
  "questions contre-intuitives": "Question contre-intuitive",
  "cas-limites": "Cas limite",
  "mini-enquetes": "Mini enquête",
};

function getDifficultyLabel(difficulty: QuizDifficultyId): string {
  return difficulty === "low" ? "Faible" : difficulty === "medium" ? "Moyen" : "Élevé";
}

function getTrapLevelLabel(trapLevel: string): string {
  return QUIZ_TRAP_LEVELS.find((item) => item.id === trapLevel)?.label ?? trapLevel;
}

function getPedagogicalOptions(): QuizPedagogicalTypeId[] {
  return [...QUIZ_PEDAGOGICAL_TYPE_PRIORITY];
}

function matchesStringFilter(value: string | undefined, selected: string): boolean {
  return selected === "all" || value === selected;
}

function getShortText(question: string, maxLength: number): string {
  if (question.length <= maxLength) {
    return question;
  }

  return `${question.slice(0, maxLength - 1).trimEnd()}…`;
}

function filterQuestions(
  questions: QuizBankAdminQuestion[],
  filters: QuizBankAdminFilters,
): QuizBankAdminQuestion[] {
  return questions.filter((question) => {
    if (filters.mode !== "all" && !question.accessTypeIds.includes(filters.mode)) {
      return false;
    }

    if (!matchesStringFilter(question.pedagogicalType, filters.pedagogicalType)) {
      return false;
    }

    if (!matchesStringFilter(question.skill, filters.skill)) {
      return false;
    }

    if (!matchesStringFilter(question.difficulty, filters.difficulty)) {
      return false;
    }

    if (!matchesStringFilter(question.trapLevel, filters.trapLevel)) {
      return false;
    }

    if (!matchesStringFilter(question.sourceType, filters.sourceType)) {
      return false;
    }

    if (filters.sourceState !== "all" && question.sourceState !== filters.sourceState) {
      return false;
    }

    if (filters.needsReview === "only" && !question.needsReview) {
      return false;
    }

    if (filters.needsReview === "excluded" && question.needsReview) {
      return false;
    }

    return true;
  });
}

function getQuestionTone(question: QuizBankAdminQuestion): "rose" | "amber" | "emerald" | "sky" {
  if (question.sourceState === "missing") {
    return "rose";
  }

  if (question.sourceState === "weak" || question.priorityScore >= 80) {
    return "amber";
  }

  return "sky";
}

function QuestionCard({ question }: { question: QuizBankAdminQuestion }) {
  return (
    <details
      id={question.id}
      className="group rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-[0_16px_40px_-32px_rgba(69,45,28,0.2)]"
    >
      <summary className="cursor-pointer list-none">
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
      </summary>

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
    </details>
  );
}

export function QuizBankAdminView({ snapshot }: { snapshot: QuizBankAdminSnapshot }) {
  const [filters, setFilters] = useState<QuizBankAdminFilters>(DEFAULT_FILTERS);

  const filteredQuestions = useMemo(() => filterQuestions(snapshot.questions, filters), [filters, snapshot.questions]);

  const modeOptions = QUIZ_ACCESS_TYPES;
  const pedagogicalOptions = useMemo(() => {
    const values = new Set<QuizPedagogicalTypeId>();
    snapshot.questions.forEach((question) => values.add(question.pedagogicalType));
    return getPedagogicalOptions().filter((type) => values.has(type));
  }, [snapshot.questions]);
  const skillOptions = useMemo(() => {
    const values = new Set<QuizReasoningType>();
    snapshot.questions.forEach((question) => values.add(question.skill));
    return Array.from(values);
  }, [snapshot.questions]);
  const sourceTypeOptions = useMemo(() => {
    const values = new Set<QuizSourceType>();
    snapshot.questions.forEach((question) => {
      if (question.sourceType) {
        values.add(question.sourceType);
      }
    });
    return Array.from(values);
  }, [snapshot.questions]);

  const obviousQuestionCount = snapshot.obviousCount;
  const reviewQuestionCount = snapshot.reviewCount;
  const sourceMissingCount = snapshot.missingSourceCount;
  const weakSourceCount = snapshot.weakSourceCount;

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-stone-200 bg-white/80 p-5 shadow-[0_16px_40px_-32px_rgba(69,45,28,0.24)] backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-stone-500">
              Vue interne
            </p>
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Banque de questions du quiz
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-stone-600">
              Vue d&apos;audit réservée aux administrateurs pour relire, filtrer et corriger les questions sans ouvrir la banque dans le code. Cette interface reste en lecture seule tant qu&apos;aucun éditeur persistant n&apos;est branché.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-600">
            <span className="rounded-full border border-stone-200 bg-white px-3 py-2">
              Guide d&apos;authoring
            </span>
            <span className="rounded-full border border-stone-200 bg-white px-3 py-2">
              Grille qualité
            </span>
            <span className="rounded-full border border-stone-200 bg-white px-3 py-2">
              Vue lecture seule
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Questions"
          value={String(snapshot.totalQuestions)}
          tone="amber"
          description="Total de la banque visible dans cette vue."
          badge={<SourceBadge tone="amber">Banque</SourceBadge>}
        />
        <StatCard
          label="À relire"
          value={String(reviewQuestionCount)}
          tone="rose"
          description="Questions signalées needsReview ou marquées par l'audit."
          badge={<SourceBadge tone="rose">Audit</SourceBadge>}
        />
        <StatCard
          label="Sans source"
          value={String(sourceMissingCount)}
          tone="rose"
          description="Questions à bloquer en priorité avant publication."
          badge={<SourceBadge tone="rose">Traçabilité</SourceBadge>}
        />
        <StatCard
          label="Sources faibles"
          value={String(weakSourceCount)}
          tone="amber"
          description="Sources internes, estimations ou références trop vagues."
          badge={<SourceBadge tone="amber">Sourçage</SourceBadge>}
        />
        <StatCard
          label="Trop évidentes"
          value={String(obviousQuestionCount)}
          tone="amber"
          description="Questions qui demandent une reformulation ou un piège plus juste."
          badge={<SourceBadge tone="amber">Piège</SourceBadge>}
        />
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-[0_16px_40px_-32px_rgba(69,45,28,0.18)]">
        <AdminSectionHeader
          eyebrow="Filtres"
          title="Revue éditoriale"
          description="Filtrer par mode, type pédagogique, compétence, difficulté, niveau de piège, source et statut de relecture."
          action={
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
            >
              <RotateCcw size={14} />
              Réinitialiser
            </button>
          }
        />

        <div className="mt-6 space-y-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-600">
              <Filter size={14} />
              Mode
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilters((current) => ({ ...current, mode: "all" }))}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition",
                  filters.mode === "all"
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50",
                )}
              >
                Tous
              </button>
              {modeOptions.map((mode) => {
                const isSelected = filters.mode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setFilters((current) => ({ ...current, mode: mode.id }))}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-semibold transition",
                      isSelected
                        ? "border-amber-400 bg-amber-50 text-amber-900"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50",
                    )}
                  >
                    {mode.label} · {snapshot.byMode[mode.id] ?? 0}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 text-sm font-medium text-stone-700">
              <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-stone-500">
                Type pédagogique
              </span>
              <select
                value={filters.pedagogicalType}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, pedagogicalType: event.target.value as QuizBankAdminFilters["pedagogicalType"] }))
                }
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-300"
              >
                <option value="all">Tous</option>
                {pedagogicalOptions.map((type) => (
                  <option key={type} value={type}>
                    {getQuizPedagogicalTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-stone-700">
              <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-stone-500">
                Compétence
              </span>
              <select
                value={filters.skill}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, skill: event.target.value as QuizBankAdminFilters["skill"] }))
                }
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-300"
              >
                <option value="all">Toutes</option>
                {skillOptions.map((skill) => (
                  <option key={skill} value={skill}>
                    {REASONING_TYPE_LABELS[skill]}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-stone-700">
              <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-stone-500">
                Difficulté
              </span>
              <select
                value={filters.difficulty}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, difficulty: event.target.value as QuizBankAdminFilters["difficulty"] }))
                }
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-300"
              >
                <option value="all">Toutes</option>
                {QUIZ_DIFFICULTY_PRIORITY.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {getDifficultyLabel(difficulty)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-stone-700">
              <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-stone-500">
                Piège
              </span>
              <select
                value={filters.trapLevel}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, trapLevel: event.target.value as QuizBankAdminFilters["trapLevel"] }))
                }
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-300"
              >
                <option value="all">Tous</option>
                {QUIZ_TRAP_LEVELS.map((trapLevel) => (
                  <option key={trapLevel.id} value={trapLevel.id}>
                    {trapLevel.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-stone-700">
              <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-stone-500">
                Type de source
              </span>
              <select
                value={filters.sourceType}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, sourceType: event.target.value as QuizBankAdminFilters["sourceType"] }))
                }
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-300"
              >
                <option value="all">Tous</option>
                {sourceTypeOptions.map((sourceType) => (
                  <option key={sourceType} value={sourceType}>
                    {SOURCE_TYPE_LABELS[sourceType]}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-stone-700">
              <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-stone-500">
                État source
              </span>
              <select
                value={filters.sourceState}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, sourceState: event.target.value as QuizBankAdminFilters["sourceState"] }))
                }
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-300"
              >
                <option value="all">Toutes</option>
                <option value="sourced">Documentée</option>
                <option value="weak">Faible</option>
                <option value="missing">Sans source</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-stone-700">
              <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-stone-500">
                needsReview
              </span>
              <select
                value={filters.needsReview}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, needsReview: event.target.value as QuizBankAdminFilters["needsReview"] }))
                }
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-300"
              >
                <option value="all">Tous</option>
                <option value="only">Seulement à relire</option>
                <option value="excluded">Exclure les questions à relire</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
            <span>
              {filteredQuestions.length} question{filteredQuestions.length > 1 ? "s" : ""} affichée{filteredQuestions.length > 1 ? "s" : ""} sur {snapshot.totalQuestions}
            </span>
            <span className="flex items-center gap-2">
              <ShieldAlert size={15} className="text-amber-600" />
              Les questions à relire restent triées en tête.
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <AdminSectionHeader
          eyebrow="Questions"
          title="Liste priorisée"
          description="La liste reste ordonnée par besoin éditorial, puis par alertes de source et de qualité."
        />

        {filteredQuestions.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-stone-300 bg-white p-8 text-center text-stone-600">
            Aucune question ne correspond à ces filtres.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((question) => (
              <QuestionCard key={question.id} question={question} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-[0_16px_40px_-32px_rgba(69,45,28,0.18)]">
        <AdminSectionHeader
          eyebrow="Références"
          title="Documentation associée"
          description="Utiliser ces repères pour corriger la banque sans rouvrir le code."
          action={
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-600">
                Règles d&apos;écriture
              </span>
              <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-600">
                Contrôle qualité
              </span>
            </div>
          }
        />
        <p className="mt-4 max-w-4xl text-sm leading-6 text-stone-600">
          Cette vue ne modifie pas les données. Elle sert à repérer les questions sans source, trop évidentes ou trop faibles pédagogiquement, puis à renvoyer vers la rubrique de correction la plus pertinente.
        </p>
      </section>
    </div>
  );
}
