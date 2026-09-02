"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, GraduationCap, School } from "lucide-react";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import { cn } from "@/lib/utils";
import { QUIZ_SCHOOL_FORMAT_ORDER, QUIZ_SCHOOL_LEVEL_ORDER, type QuizSchoolFormat, type QuizSchoolLevel } from "@/lib/learning/quiz/school/quiz-school-types";
import { getQuizUiCopy } from "@/lib/learning/quiz/quiz-i18n";

const INTERACTIVE_FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

type QuizSchoolPickerProps = {
  locale: SupportedLocale;
  collectiveMode: boolean;
  onToggleCollectiveMode: () => void;
  onLaunchSchoolSession: (level: QuizSchoolLevel, format: QuizSchoolFormat) => void;
  onBackToAccessType: () => void;
};

export function QuizSchoolPicker({
  locale,
  collectiveMode,
  onToggleCollectiveMode,
  onLaunchSchoolSession,
  onBackToAccessType,
}: QuizSchoolPickerProps) {
  const [selectedLevel, setSelectedLevel] = useState<QuizSchoolLevel | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<QuizSchoolFormat>(QUIZ_SCHOOL_FORMAT_ORDER[0]);
  return (
    <div className="space-y-12 py-10">
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onBackToAccessType}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            {getQuizUiCopy(locale, "school.back")}
          </button>
        </div>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto inline-flex items-center gap-3 rounded-full border border-amber-100 bg-amber-50 px-6 py-2"
        >
          <School className="text-amber-700" size={20} />
          <span className="text-sm font-black uppercase tracking-widest text-amber-800">
            {getQuizUiCopy(locale, "school.bannerLabel")}
          </span>
        </motion.div>
        <h2 className="text-4xl font-black tracking-tight cmm-text-primary md:text-5xl">
          {getQuizUiCopy(locale, "school.title")}
        </h2>
        <p className="mx-auto max-w-3xl text-lg font-medium cmm-text-secondary">
          {getQuizUiCopy(locale, "school.description")}
        </p>
      </div>

      <div className="mx-auto max-w-6xl rounded-[2rem] border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 md:text-xs">
              {getQuizUiCopy(locale, "school.collectiveTitle")}
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-950">
              {getQuizUiCopy(locale, "school.collectiveTitle")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {getQuizUiCopy(locale, "school.collectiveDescription")}
            </p>
            <Link
              href="/learn/ecole"
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-black text-amber-900 transition hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50"
            >
              {getQuizUiCopy(locale, "school.linkTeacherKit")}
            </Link>
          </div>
          <button
            type="button"
            onClick={onToggleCollectiveMode}
            className={cn(
              `${INTERACTIVE_FOCUS_RING} inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-widest transition`,
              collectiveMode
                ? "border border-amber-300 bg-amber-600 text-white shadow-lg shadow-amber-600/20 hover:bg-amber-700"
                : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            {collectiveMode
              ? getQuizUiCopy(locale, "school.collective.enabled")
              : getQuizUiCopy(locale, "school.collective.disabled")}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-start gap-3">
          <GraduationCap className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-black text-slate-950">{getQuizUiCopy(locale, "school.levelPrompt")}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{getQuizUiCopy(locale, "school.levelNote")}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {QUIZ_SCHOOL_LEVEL_ORDER.map((level, index) => (
          <motion.button
            key={level}
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            onClick={() => setSelectedLevel(level)}
            aria-pressed={selectedLevel === level}
            className="group relative overflow-hidden rounded-[2.25rem] border border-slate-100 bg-white p-7 text-left shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-inner">
              <GraduationCap size={28} aria-hidden="true" />
            </div>
            <h3 className="text-xl font-black cmm-text-primary">{getQuizUiCopy(locale, `school.level.${level}.label`)}</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">{getQuizUiCopy(locale, `school.level.${level}.description`)}</p>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500 md:text-sm">
              {getQuizUiCopy(locale, "school.questionsLabel")} · {getQuizUiCopy(locale, "school.durationLabel")}
            </p>
            <ul className="mt-4 space-y-2 text-sm font-medium text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                <span>{getQuizUiCopy(locale, "school.levelNote")}</span>
              </li>
            </ul>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 md:text-xs">
                {getQuizUiCopy(locale, "school.takeawayLabel")}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800">{getQuizUiCopy(locale, "school.collectiveDescription")}</p>
            </div>
            <div className="absolute bottom-0 right-0 p-4 opacity-0 transition-opacity group-hover:opacity-100">
              <CheckCircle className="text-amber-500" size={32} />
            </div>
          </motion.button>
        ))}
      </div>

      {selectedLevel ? (
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-amber-200 bg-amber-50/80 p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">{getQuizUiCopy(locale, "school.format.badge")}</p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">{getQuizUiCopy(locale, "school.formatPrompt")} · {selectedLevel}</h3>
            </div>
            <button type="button" onClick={() => setSelectedLevel(null)} className={`${INTERACTIVE_FOCUS_RING} rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-amber-900`}>{getQuizUiCopy(locale, "school.format.back")}</button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {QUIZ_SCHOOL_FORMAT_ORDER.map((format) => (
              <button key={format} type="button" aria-pressed={selectedFormat === format} onClick={() => setSelectedFormat(format)} className={`${INTERACTIVE_FOCUS_RING} rounded-2xl border p-5 text-left transition ${selectedFormat === format ? "border-amber-600 bg-white shadow-md" : "border-amber-200 bg-amber-50 hover:bg-white"}`}>
                <p className="text-lg font-black text-slate-950">{getQuizUiCopy(locale, `school.format.${format}.label`)}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{getQuizUiCopy(locale, `school.format.${format}.description`)}</p>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => onLaunchSchoolSession(selectedLevel, selectedFormat)} className={`${INTERACTIVE_FOCUS_RING} mt-5 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-amber-700`}>
            {getQuizUiCopy(locale, "school.format.cta")}<ArrowLeft className="rotate-180" size={16} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
