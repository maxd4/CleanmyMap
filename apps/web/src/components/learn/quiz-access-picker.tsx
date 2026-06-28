"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Brain,
  Calculator,
  GraduationCap,
  FlaskConical,
  Megaphone,
  PlayCircle,
  Shuffle,
  MapPin,
  Repeat2,
  ShieldAlert,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import { QUIZ_ACCESS_TYPES, type QuizAccessTypeId } from "@/components/learn/quiz-access-types";
import { getDefaultQuizSessionSize } from "@/lib/learning/quiz-selection-engine";
import { QUIZ_TRAP_LEVELS, type QuizTrapLevelId } from "@/components/learn/quiz-trap-levels";
import {
  QuizPersonalProgressOverview,
} from "@/components/learn/quiz-personal-progress-overview";
import type { QuizPersonalProgressSnapshot } from "@/lib/learning/quiz-personal-progress";
import { getQuizUiCopy } from "@/lib/learning/quiz-i18n";

const INTERACTIVE_FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

type QuizAccessPickerProps = {
  locale: SupportedLocale;
  selectedTrapLevel: QuizTrapLevelId | null;
  personalProgress?: QuizPersonalProgressSnapshot | null;
  onSelectTrapLevel: (trapLevel: QuizTrapLevelId | null) => void;
  onSelectAccessType: (accessType: QuizAccessTypeId) => void;
  onStartDemoMode: () => void;
};

const ACCESS_TYPE_DISPLAY: Record<
  QuizAccessTypeId,
  { tone: string; icon: ReactNode }
> = {
  mixte: {
    tone: "bg-violet-100 text-violet-700",
    icon: <Shuffle size={28} />,
  },
  ecole: {
    tone: "bg-amber-100 text-amber-800",
    icon: <GraduationCap size={28} />,
  },
  terrain: {
    tone: "bg-emerald-100 text-emerald-700",
    icon: <MapPin size={28} />,
  },
  "donnees-scientifiques": {
    tone: "bg-sky-100 text-sky-700",
    icon: <FlaskConical size={28} />,
  },
  sensibilisation: {
    tone: "bg-rose-100 text-rose-700",
    icon: <Megaphone size={28} />,
  },
  "habitudes-de-vie": {
    tone: "bg-amber-100 text-amber-800",
    icon: <Repeat2 size={28} />,
  },
  "ordres-de-grandeur": {
    tone: "bg-blue-100 text-blue-700",
    icon: <Calculator size={28} />,
  },
  "tri-securite": {
    tone: "bg-slate-100 text-slate-700",
    icon: <ShieldAlert size={28} />,
  },
};

const DISPLAY_ACCESS_TYPES = QUIZ_ACCESS_TYPES.filter((accessType) => accessType.id !== "ecole");

export function QuizAccessPicker({
  locale,
  selectedTrapLevel,
  personalProgress,
  onSelectTrapLevel,
  onSelectAccessType,
  onStartDemoMode,
}: QuizAccessPickerProps) {
  return (
    <div className="space-y-12 py-10">
      <div className="space-y-4 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-4 inline-flex items-center gap-3 rounded-full border border-emerald-100 bg-emerald-50 px-6 py-2"
        >
          <Brain className="text-emerald-600" size={20} />
          <span className="text-sm font-black uppercase tracking-widest text-emerald-800">
            {getQuizUiCopy(locale, "access.bannerLabel")}
          </span>
        </motion.div>
        <h2 className="text-4xl font-black tracking-tight cmm-text-primary md:text-5xl">
          {getQuizUiCopy(locale, "access.title")}
        </h2>
        <p className="mx-auto max-w-2xl text-lg font-medium cmm-text-secondary">
          {getQuizUiCopy(locale, "access.description")}
        </p>
      </div>

      <div className="mx-auto max-w-6xl rounded-[2rem] border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 md:text-xs">
              {getQuizUiCopy(locale, "access.school.bannerLabel")}
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-950">
              {getQuizUiCopy(locale, "access.school.ctaTitle")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {getQuizUiCopy(locale, "access.school.ctaText")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onSelectAccessType("ecole")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50"
            >
              <GraduationCap size={18} aria-hidden="true" />
              {getQuizUiCopy(locale, "access.school.ctaLabel")}
            </button>
            <Link
              href="/learn/ecole"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-widest text-amber-900 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50"
            >
              {getQuizUiCopy(locale, "school.linkTeacherKit")}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl rounded-[2rem] border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 md:text-xs">
              {getQuizUiCopy(locale, "access.demo.bannerLabel")}
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-950">
              {getQuizUiCopy(locale, "access.demo.ctaTitle")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {getQuizUiCopy(locale, "access.demo.ctaText")}
            </p>
          </div>
          <button
            type="button"
            onClick={onStartDemoMode}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50"
          >
            <PlayCircle size={18} aria-hidden="true" />
            {getQuizUiCopy(locale, "access.demo.ctaLabel")}
          </button>
        </div>
      </div>

      {personalProgress ? (
        <QuizPersonalProgressOverview locale={locale} snapshot={personalProgress} density="compact" />
      ) : null}

      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 text-sm font-medium text-slate-600">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          {getQuizUiCopy(locale, "access.sessionShort")}
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          {getDefaultQuizSessionSize("terrain")} {getQuizUiCopy(locale, "access.questionsByMode")}
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          {getDefaultQuizSessionSize("mixte")} {getQuizUiCopy(locale, "access.questionsMixedMode")}
        </span>
      </div>

      <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 md:text-xs">
              {getQuizUiCopy(locale, "access.trapModeLabel")}
            </p>
            <h3 className="mt-1 text-lg font-black cmm-text-primary">{getQuizUiCopy(locale, "access.trapModeTitle")}</h3>
            <p className="mt-1 text-sm leading-relaxed cmm-text-secondary">
              {getQuizUiCopy(locale, "access.trapModeDescription")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectTrapLevel(null)}
            className={cn(
              `${INTERACTIVE_FOCUS_RING} rounded-full border px-4 py-2 text-sm font-bold transition`,
              !selectedTrapLevel
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
            )}
          >
            {getQuizUiCopy(locale, "access.trapModeAll")}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {QUIZ_TRAP_LEVELS.map((trapLevel) => (
            <button
              key={trapLevel.id}
              type="button"
              onClick={() => onSelectTrapLevel(trapLevel.id)}
              className={cn(
                `${INTERACTIVE_FOCUS_RING} rounded-2xl border p-4 text-left transition`,
                selectedTrapLevel === trapLevel.id
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              <p className="text-sm font-black uppercase tracking-widest cmm-text-primary">{trapLevel.label}</p>
              <p className="mt-2 text-sm leading-relaxed cmm-text-secondary">{trapLevel.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {DISPLAY_ACCESS_TYPES.map((accessType, index) => {
          const display = ACCESS_TYPE_DISPLAY[accessType.id];
          const modeLevel = personalProgress?.modeLevels.find((mode) => mode.id === accessType.id);

          return (
            <motion.button
              key={accessType.id}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onSelectAccessType(accessType.id)}
              className="group relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white p-8 text-left shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <div className="mb-3 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 md:text-xs">
                {accessType.learningLabel[locale]}
              </div>
              <div
                className={cn(
                  "mb-6 flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner",
                  display.tone,
                )}
              >
                {display.icon}
              </div>
              <h3 className="mb-2 text-xl font-black cmm-text-primary">
                {getQuizUiCopy(locale, accessType.labelKey)}
              </h3>
              <p className="text-sm font-medium leading-relaxed text-slate-700">
                {accessType.description[locale]}
              </p>
              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 md:text-xs">
                {getDefaultQuizSessionSize(accessType.id)} questions
              </p>
              {modeLevel ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 md:text-xs">
                    {getQuizUiCopy(locale, "access.currentLevel")}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    Niveau {modeLevel.level}
                    <span className="mx-2 text-slate-300">•</span>
                    {modeLevel.levelLabel}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{modeLevel.detail}</p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3">
                  <p className="text-xs leading-relaxed text-slate-500">
                    {getQuizUiCopy(locale, "access.noSession")}
                  </p>
                </div>
              )}
              <ul className="mt-5 space-y-2 text-sm font-medium text-slate-700">
                {accessType.focus[locale].map((focus) => (
                  <li key={focus} className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                    <span>{focus}</span>
                  </li>
                ))}
              </ul>
              <div className="absolute bottom-0 right-0 p-4 opacity-0 transition-opacity group-hover:opacity-100">
                <CheckCircle className="text-emerald-500" size={32} />
              </div>
            </motion.button>
          );
        })}
      </div>

      <p className="text-center text-sm cmm-text-secondary">
        {getQuizUiCopy(locale, "access.footerNote")}
      </p>
    </div>
  );
}
