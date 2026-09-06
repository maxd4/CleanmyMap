"use client";

import { useMemo, useState } from "react";
import { AdminSectionHeader } from "@/components/admin/admin-dashboard-ui";
import { SourceBadge, StatCard } from "@/components/ui/page-structure";
import type {
  QuizBankAdminFilters,
  QuizBankAdminSnapshot,
} from "@/lib/learning/quiz/quiz-bank-admin";
import {
  DEFAULT_QUIZ_BANK_ADMIN_FILTERS,
  filterQuizBankAdminQuestions,
} from "@/lib/learning/quiz/quiz-bank-admin";
import { QuizBankAdminFilters as QuizBankAdminFiltersPanel } from "./quiz-bank-admin-view.filters";
import { QuestionCard } from "./quiz-bank-admin-view.question-card";

export function QuizBankAdminView({ snapshot }: { snapshot: QuizBankAdminSnapshot }) {
  const [filters, setFilters] = useState<QuizBankAdminFilters>(DEFAULT_QUIZ_BANK_ADMIN_FILTERS);
  const filteredQuestions = useMemo(
    () => filterQuizBankAdminQuestions(snapshot.questions, filters),
    [filters, snapshot.questions],
  );

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


      <QuizBankAdminFiltersPanel
        snapshot={snapshot}
        filters={filters}
        filteredQuestionCount={filteredQuestions.length}
        onFiltersChange={setFilters}
      />

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
