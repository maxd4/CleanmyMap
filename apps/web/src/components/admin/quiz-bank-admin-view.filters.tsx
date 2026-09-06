import { useMemo, type Dispatch, type SetStateAction } from "react";
import { Filter, RotateCcw, ShieldAlert } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/admin-dashboard-ui";
import { cn } from "@/lib/utils";
import { QUIZ_ACCESS_TYPES } from "@/lib/learning/quiz/quiz-access-types";
import {
  QUIZ_DIFFICULTY_PRIORITY,
  QUIZ_PEDAGOGICAL_TYPE_PRIORITY,
  getQuizPedagogicalTypeLabel,
  type QuizPedagogicalTypeId,
} from "@/lib/learning/quiz/quiz-taxonomy";
import { QUIZ_TRAP_LEVELS } from "@/lib/learning/quiz/quiz-trap-levels";
import {
  DEFAULT_QUIZ_BANK_ADMIN_FILTERS,
  type QuizBankAdminFilters,
  type QuizBankAdminQuestion,
  type QuizBankAdminSnapshot,
} from "@/lib/learning/quiz/quiz-bank-admin";
import {
  getDifficultyLabel,
  SOURCE_TYPE_LABELS,
} from "./quiz-bank-admin-view.presentation";

export function QuizBankAdminFilters({
  snapshot,
  filters,
  filteredQuestionCount,
  onFiltersChange,
}: {
  snapshot: QuizBankAdminSnapshot;
  filters: QuizBankAdminFilters;
  filteredQuestionCount: number;
  onFiltersChange: Dispatch<SetStateAction<QuizBankAdminFilters>>;
}) {
  const pedagogicalOptions = useMemo(() => {
    const values = new Set<QuizPedagogicalTypeId>();
    snapshot.questions.forEach((question) => values.add(question.pedagogicalType));
    return [...QUIZ_PEDAGOGICAL_TYPE_PRIORITY].filter((type) => values.has(type));
  }, [snapshot.questions]);

  const skillOptions = useMemo(() => {
    const values = new Map<QuizBankAdminQuestion["skill"], string>();
    snapshot.questions.forEach((question) => values.set(question.skill, question.skillLabel));
    return Array.from(values, ([id, label]) => ({ id, label }));
  }, [snapshot.questions]);

  const sourceTypeOptions = useMemo(() => {
    const values = new Set<NonNullable<QuizBankAdminQuestion["sourceType"]>>();
    snapshot.questions.forEach((question) => {
      if (question.sourceType) {
        values.add(question.sourceType);
      }
    });
    return Array.from(values);
  }, [snapshot.questions]);

  return (
    <section className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-[0_16px_40px_-32px_rgba(69,45,28,0.18)]">
      <AdminSectionHeader
        eyebrow="Filtres"
        title="Revue éditoriale"
        description="Filtrer par mode, type pédagogique, compétence, difficulté, niveau de piège, source et statut de relecture."
        action={
          <button
            type="button"
            onClick={() => onFiltersChange(DEFAULT_QUIZ_BANK_ADMIN_FILTERS)}
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
              onClick={() => onFiltersChange((current) => ({ ...current, mode: "all" }))}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                filters.mode === "all"
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50",
              )}
            >
              Tous
            </button>
            {QUIZ_ACCESS_TYPES.map((mode) => {
              const isSelected = filters.mode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onFiltersChange((current) => ({ ...current, mode: mode.id }))}
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
                onFiltersChange((current) => ({ ...current, pedagogicalType: event.target.value as QuizBankAdminFilters["pedagogicalType"] }))
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
                onFiltersChange((current) => ({ ...current, skill: event.target.value as QuizBankAdminFilters["skill"] }))
              }
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-300"
            >
              <option value="all">Toutes</option>
              {skillOptions.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.label}
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
                onFiltersChange((current) => ({ ...current, difficulty: event.target.value as QuizBankAdminFilters["difficulty"] }))
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
                onFiltersChange((current) => ({ ...current, trapLevel: event.target.value as QuizBankAdminFilters["trapLevel"] }))
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
                onFiltersChange((current) => ({ ...current, sourceType: event.target.value as QuizBankAdminFilters["sourceType"] }))
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
                onFiltersChange((current) => ({ ...current, sourceState: event.target.value as QuizBankAdminFilters["sourceState"] }))
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
                onFiltersChange((current) => ({ ...current, needsReview: event.target.value as QuizBankAdminFilters["needsReview"] }))
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
            {filteredQuestionCount} question{filteredQuestionCount > 1 ? "s" : ""} affichée{filteredQuestionCount > 1 ? "s" : ""} sur {snapshot.totalQuestions}
          </span>
          <span className="flex items-center gap-2">
            <ShieldAlert size={15} className="text-amber-600" />
            Les questions à relire restent triées en tête.
          </span>
        </div>
      </div>
    </section>
  );
}
