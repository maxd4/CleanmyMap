"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

import { RESOURCE_SHORTCUTS } from "./learn-ressources-client.data";

export function LearnResourceShortcutsSection({ locale }: { locale: LearnLocale }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {locale === "fr" ? "Raccourcis utiles" : "Useful shortcuts"}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Les liens directs vers les rubriques utiles" : "Direct links to the useful rubrics"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "Les liens restent groupés au même endroit pour ouvrir vite l'assistant tri, le guide compost ou le contexte."
              : "The links stay grouped in one place so you can open the sorting assistant, compost guide or context quickly."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {RESOURCE_SHORTCUTS.map((shortcut) => (
          <article
            key={shortcut.href}
            className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 shadow-sm transition focus-within:ring-2 focus-within:ring-amber-300/40"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">{shortcut.eyebrow[locale]}</p>
            <h4 className="mt-1 text-lg font-black tracking-tight text-slate-900">{shortcut.title[locale]}</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{shortcut.detail[locale]}</p>
            <Link
              href={shortcut.href}
              className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-900 transition hover:-translate-y-[1px] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
            >
              {shortcut.label[locale]}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
