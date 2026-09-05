"use client";

import type { ReactNode } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Truck } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { GuideOperationalPanel } from "./guide-section";
import type {
  PreparationQuickAction,
  PreparationStep,
  UsefulBlock,
} from "./weather-section.preparation.data";
import { getCurrentWindowLabel } from "./weather-section.helpers";
import { LightCard } from "./weather-section.ui";
import { cn } from "@/lib/utils";

export function PreparationGuide({
  fr,
  recommendedWindow,
  prepSteps,
  usefulBlocks,
  quickActions,
  kitCard,
}: {
  fr: boolean;
  recommendedWindow: { from: string; to: string } | null;
  prepSteps: PreparationStep[];
  usefulBlocks: UsefulBlock[];
  quickActions: PreparationQuickAction[];
  kitCard: ReactNode;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.05fr_1fr]">
        {kitCard}
        <LightCard className="border-emerald-100 bg-white/95 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
              <CalendarDays size={18} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">
                {fr ? "Se préparer avant de partir" : "Prepare before leaving"}
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                {fr ? "Avant / pendant / après" : "Before / during / after"}
              </h3>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {prepSteps.map((step, index) => {
              const StepIcon = step.icon;
              const stepTone =
                step.tone === "emerald"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-sky-200 bg-sky-50 text-sky-700";

              return (
                <div key={step.label} className="grid grid-cols-[auto_1fr] gap-4">
                  <div className="flex flex-col items-center">
                    <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl border", stepTone)}>
                      <StepIcon size={20} />
                    </div>
                    {index < prepSteps.length - 1 ? (
                      <div className="mt-2 h-full w-px flex-1 bg-slate-200" />
                    ) : null}
                  </div>

                  <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                          {step.label}
                        </p>
                        <h4 className="mt-1 text-base font-black tracking-tight text-slate-900">
                          {step.title}
                        </h4>
                      </div>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                        {index === 0
                          ? fr
                            ? "Avant"
                            : "Before"
                          : index === 1
                            ? fr
                              ? "Pendant"
                              : "During"
                            : fr
                              ? "Après"
                              : "After"}
                      </span>
                    </div>

                    {index === 0 && recommendedWindow ? (
                      <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs font-medium text-emerald-900">
                        {fr ? "Créneau conseillé" : "Suggested slot"}: {" "}
                        {getCurrentWindowLabel(recommendedWindow.from, recommendedWindow.to, fr ? "fr" : "en")}
                      </div>
                    ) : null}

                    <ul className="mt-3 space-y-2">
                      {step.points.map((point) => (
                        <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                            <CheckCircle2 size={11} />
                          </span>
                          <span className="leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </LightCard>

        <LightCard className="border-emerald-100 bg-white/95 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
              <Truck size={18} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">
                {fr ? "Repères utiles" : "Useful references"}
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                {fr ? "Bien cadrer la cleanwalk" : "Frame the cleanwalk well"}
              </h3>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {usefulBlocks.map((block) => {
              const BlockIcon = block.icon;
              const toneStyles =
                block.tone === "emerald"
                  ? "border-emerald-200 bg-emerald-50/70 text-emerald-700"
                  : block.tone === "rose"
                    ? "border-rose-200 bg-rose-50/70 text-rose-700"
                    : block.tone === "sky"
                      ? "border-sky-200 bg-sky-50/70 text-sky-700"
                      : "border-amber-200 bg-amber-50/70 text-amber-700";

              return (
                <div key={block.title} className={cn("rounded-[1.35rem] border p-4", toneStyles)}>
                  <div className="flex items-center gap-2">
                    <BlockIcon size={18} />
                    <p className="text-sm font-black tracking-tight">
                      {block.title}
                    </p>
                  </div>

                  {"points" in block ? (
                    <ul className="mt-3 space-y-2">
                      {block.points.map((point) => (
                        <li key={point} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/70 text-current">
                            <CheckCircle2 size={11} />
                          </span>
                          <span className="leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {"chips" in block ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {block.chips.map((chip) => (
                        <span
                          key={chip}
                          className="inline-flex items-center gap-1 rounded-full border border-current/20 bg-white/80 px-3 py-1 text-[11px] font-semibold"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {"reflexes" in block ? (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {block.reflexes.map((reflex) => {
                        const ReflexIcon = reflex.icon;

                        return (
                          <div key={reflex.label} className="rounded-2xl border border-white/60 bg-white/75 p-3 text-center shadow-sm">
                            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-current/20 bg-white/90">
                              <ReflexIcon size={15} />
                            </div>
                            <p className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-700">
                              {reflex.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </LightCard>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => {
          const ActionIcon = action.icon;
          const toneStyles =
            action.tone === "emerald"
              ? "border-emerald-200 bg-emerald-50/80 text-emerald-700"
              : action.tone === "sky"
                ? "border-sky-200 bg-sky-50/80 text-sky-700"
                : action.tone === "violet"
                  ? "border-violet-200 bg-violet-50/80 text-violet-700"
                  : "border-amber-200 bg-amber-50/80 text-amber-700";

          return (
            <CmmButton
              key={action.title}
              href={action.href}
              tone="secondary"
              variant="pill"
              className="h-full w-full rounded-[1.35rem] border border-slate-200 bg-white/95 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-transform hover:-translate-y-0.5"
            >
              <div className="flex w-full items-center gap-3 text-left">
                <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border", toneStyles)}>
                  <ActionIcon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black tracking-tight text-slate-900">
                    {action.title}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                    {action.description}
                  </span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-slate-400" />
              </div>
            </CmmButton>
          );
        })}
      </div>

      <div className="pt-2">
        <GuideOperationalPanel />
      </div>
    </>
  );
}
