"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, CheckCircle, School } from "lucide-react";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import { cn } from "@/lib/utils";
import {
  QUIZ_SCHOOL_TRACKS,
  type QuizSchoolTrackId,
} from "@/components/learn/quiz-school-modes";
import { getQuizUiCopy } from "@/lib/learning/quiz-i18n";

const INTERACTIVE_FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

type QuizSchoolPickerProps = {
  locale: SupportedLocale;
  collectiveMode: boolean;
  onToggleCollectiveMode: () => void;
  onSelectSchoolTrack: (track: QuizSchoolTrackId) => void;
  onBackToAccessType: () => void;
};

export function QuizSchoolPicker({
  locale,
  collectiveMode,
  onToggleCollectiveMode,
  onSelectSchoolTrack,
  onBackToAccessType,
}: QuizSchoolPickerProps) {
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

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {QUIZ_SCHOOL_TRACKS.map((track, index) => (
          <motion.button
            key={track.id}
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            onClick={() => onSelectSchoolTrack(track.id)}
            className="group relative overflow-hidden rounded-[2.25rem] border border-slate-100 bg-white p-7 text-left shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <div className={cn("mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner", track.tone)}>
              {track.icon}
            </div>
            <h3 className="text-xl font-black cmm-text-primary">{getQuizUiCopy(locale, track.labelKey)}</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">{track.description[locale]}</p>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500 md:text-sm">
              {getQuizUiCopy(locale, "school.questionsLabel")}
            </p>
            <ul className="mt-4 space-y-2 text-sm font-medium text-slate-700">
              {track.focus[locale].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 md:text-xs">
                {getQuizUiCopy(locale, "school.takeawayLabel")}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800">{track.keyMessages[locale][0]}</p>
            </div>
            <div className="absolute bottom-0 right-0 p-4 opacity-0 transition-opacity group-hover:opacity-100">
              <CheckCircle className="text-amber-500" size={32} />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
