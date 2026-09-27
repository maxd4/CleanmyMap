"use client";

import {
  CheckCircle2,
  Database,
  ListChecks,
  Route,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { CmmButton } from "@/components/ui/cmm-button";

const ROUTE_METHODOLOGY_STEPS = [
  { id: "inputs", icon: Database },
  { id: "candidates", icon: ListChecks },
  { id: "prioritization", icon: SlidersHorizontal },
  { id: "constraints", icon: ShieldCheck },
  { id: "result", icon: Route },
] as const;

export function RouteMethodologySection() {
  const { t } = useTranslation("methodologie");

  return (
    <section
      id="methodologie-itineraire"
      aria-labelledby="methodologie-itineraire-title"
      className="scroll-mt-8 space-y-8 rounded-[2rem] border border-rose-100 bg-white p-6 text-slate-950 shadow-[0_20px_52px_-38px_rgba(190,24,93,0.28)] md:p-10"
    >
      <div className="space-y-4">
        <p className="cmm-text-caption font-black uppercase tracking-[0.35em] text-rose-700">
          {t("routeMethodology.eyebrow")}
        </p>
        <h2
          id="methodologie-itineraire-title"
          className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl"
        >
          {t("routeMethodology.title")}
        </h2>
        <p className="max-w-4xl text-base font-medium leading-relaxed cmm-text-body">
          {t("routeMethodology.intro")}
        </p>
      </div>

      <ol
        aria-label={t("routeMethodology.title")}
        className="grid gap-4 xl:grid-cols-5"
      >
        {ROUTE_METHODOLOGY_STEPS.map(({ id, icon: Icon }, index) => (
          <li
            key={id}
            className="group flex min-h-full flex-col rounded-2xl border border-rose-100 bg-rose-50/45 p-5 transition-colors hover:border-rose-200 hover:bg-rose-50"
          >
            <div className="flex items-center justify-between gap-3 text-rose-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-300/25 bg-red-400/10">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-black tracking-[0.2em] text-rose-700">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>

            <h3 className="mt-5 text-base font-black text-slate-950">
              {t(`routeMethodology.steps.${id}.title`)}
            </h3>
            <p className="mt-3 text-sm leading-relaxed cmm-text-body">
              {t(`routeMethodology.steps.${id}.description`)}
            </p>
            <ul className="mt-4 space-y-2 text-xs leading-relaxed cmm-text-body">
              {["item1", "item2", "item3"].map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600"
                    aria-hidden="true"
                  />
                  <span>{t(`routeMethodology.steps.${id}.${item}`)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-4 rounded-2xl border border-rose-200 bg-rose-50/75 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 cmm-text-caption font-black uppercase tracking-[0.16em]">
          <span className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-rose-800">
            {t("routeMethodology.observedLabel")}
          </span>
          <span className="rounded-full border border-rose-200 bg-rose-100 px-3 py-1.5 text-rose-800">
            {t("routeMethodology.predictedLabel")}
          </span>
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-red-800">
            {t("routeMethodology.decisionLabel")}
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <CmmButton
            href="/actions/new?panel=itineraire"
            tone="primary"
            variant="pill"
            className="justify-center px-5 py-3 cmm-text-caption font-black uppercase tracking-[0.18em]"
          >
            {t("routeMethodology.cta")}
          </CmmButton>
          <CmmButton
            href="/docs/architecture/methodologie-creation-itineraire.md"
            tone="secondary"
            variant="pill"
            className="justify-center px-5 py-3 cmm-text-caption font-black uppercase tracking-[0.18em]"
          >
            {t("routeMethodology.documentation")}
          </CmmButton>
        </div>
      </div>
    </section>
  );
}
