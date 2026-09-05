"use client";

import { CheckCircle2, Leaf, MapPin, Mountain, Package, Sprout } from "lucide-react";
import type {
  PreparationHeroStat,
  PreparationKitSection,
} from "./weather-section.preparation.data";
import { LightCard } from "./weather-section.ui";
import { cn } from "@/lib/utils";

export function PreparationKitSectionView({
  fr,
  selectedLocationLabel,
  selectedLocationSubtitle,
  packItems,
  heroStats,
}: {
  fr: boolean;
  selectedLocationLabel: string;
  selectedLocationSubtitle: string;
  packItems: string[];
  heroStats: PreparationHeroStat[];
}) {
  return (
    <>
      <LightCard className="relative overflow-hidden border-emerald-100 bg-[linear-gradient(180deg,rgba(239,251,244,0.98)_0%,rgba(255,255,255,0.99)_100%)] p-7 lg:p-8">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] lg:block">
          <div className="absolute right-8 top-6 h-24 w-24 rounded-full bg-[#f7f4d9]/80" />
          <div className="absolute right-6 top-20 h-40 w-40 rounded-full bg-emerald-200/30 blur-xl" />
          <div className="absolute bottom-0 right-0 h-48 w-48 rounded-[60%_40%_0_0] bg-emerald-400/25" />
          <Leaf className="absolute right-20 top-16 h-28 w-28 text-emerald-500/30" />
          <Leaf className="absolute right-10 top-24 h-20 w-20 rotate-12 text-emerald-700/25" />
          <Mountain className="absolute bottom-5 right-24 h-20 w-20 text-emerald-600/18" />
        </div>

        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.95fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700 shadow-sm">
              <Sprout size={14} />
              {fr ? "Préparation terrain" : "Field preparation"}
            </div>
            <h3 className="text-3xl font-black tracking-tight text-emerald-950 lg:text-[3.35rem] lg:leading-[0.95]">
              {fr ? "Bien préparer sa cleanwalk" : "Prepare your cleanwalk well"}
            </h3>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600 lg:text-base">
              {fr
                ? "Une bonne préparation rend l’action plus sûre, plus agréable et plus efficace pour la nature. Anticipez, équipez-vous, respectez le lieu et repartez avec le sourire !"
                : "Good preparation makes the action safer, more enjoyable and more effective for nature. Plan ahead, equip yourself, respect the site and leave with a smile!"}
            </p>
            <div className="flex flex-wrap gap-2">
              {packItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-2 text-[12px] font-semibold text-slate-700 shadow-sm"
                >
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  {item}
                </span>
              ))}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-emerald-900 shadow-sm">
              <MapPin size={12} className="text-emerald-700" />
              {selectedLocationLabel}
              {selectedLocationSubtitle ? ` · ${selectedLocationSubtitle}` : ""}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {heroStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="rounded-[1.35rem] border border-white/70 bg-white/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-500">{stat.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      </LightCard>

    </>
  );
}

export function PreparationKitCard({
  fr,
  prepProgress,
  kitSections,
}: {
  fr: boolean;
  prepProgress: number;
  kitSections: PreparationKitSection[];
}) {
  return (
    <LightCard className="border-emerald-100 bg-white/95 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
            <Package size={18} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">
              {fr ? "Kit recommandé" : "Recommended kit"}
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
              {fr ? "Essentiel léger et pratique" : "Lightweight, practical essentials"}
            </h3>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {fr ? "Progression du kit" : "Kit progress"}
            </p>
            <p className="text-3xl font-black tracking-tight text-emerald-700">{prepProgress}%</p>
          </div>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-emerald-100">
            <div className="h-full rounded-full bg-emerald-600" style={{ width: `${prepProgress}%` }} />
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {kitSections.map((section) => {
            const SectionIcon = section.icon;
            const toneStyles =
              section.tone === "emerald"
                ? "border-emerald-100 bg-emerald-50/60 text-emerald-700"
                : section.tone === "blue"
                  ? "border-sky-100 bg-sky-50/60 text-sky-700"
                  : section.tone === "amber"
                    ? "border-amber-100 bg-amber-50/60 text-amber-700"
                    : "border-violet-100 bg-violet-50/60 text-violet-700";

            return (
              <div key={section.title} className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl border", toneStyles)}>
                    <SectionIcon size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-black tracking-tight text-slate-900">
                      {section.title}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                      {fr ? "À glisser dans le sac" : "Pack it in your bag"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {section.items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-400">
                          <CheckCircle2 size={11} />
                        </span>
                        <span className="truncate text-sm font-medium text-slate-700">
                          {item.label}
                        </span>
                      </div>
                      <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                        {item.qty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
    </LightCard>
  );
}
