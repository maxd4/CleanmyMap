"use client";

import { useId, useState } from "react";
import { ArrowRight, ChevronDown, CircleHelp } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { cn } from "@/lib/utils";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import { GESTES_PROPRES_BAROMETER_2025, GESTES_PROPRES_BAROMETER_MYTHS } from "@/lib/learning/gestes-propres-barometer";

type MythId = (typeof GESTES_PROPRES_BAROMETER_MYTHS)[number]["id"];

export function LearnGestesPropresMythsSection({
  locale,
  className,
}: {
  locale: LearnLocale;
  className?: string;
}) {
  const baseId = useId();
  const [openId, setOpenId] = useState<MythId | null>(GESTES_PROPRES_BAROMETER_MYTHS[0]?.id ?? null);

  return (
    <section
      className={cn(
        "rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))] p-4 shadow-sm md:p-5",
        className,
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Idées reçues à corriger" : "Misconceptions to correct"}
            </p>
            <h3 className="text-2xl font-black tracking-tight cmm-text-primary md:text-3xl">
              {locale === "fr"
                ? "Une réponse courte, un bon geste, un seul détail ouvert à la fois"
                : "A short answer, a good gesture, one detail open at a time"}
            </h3>
            <p className="cmm-text-small leading-relaxed cmm-text-secondary">
              {locale === "fr"
                ? "Les quatre explications restent repliées sauf celle qui est utile maintenant, pour éviter d’empiler les textes sur mobile."
                : "The four explanations stay collapsed except the one that is useful now, so text does not pile up on mobile."}
            </p>
          </div>

          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
            <CircleHelp className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        <div className="grid gap-3">
          {GESTES_PROPRES_BAROMETER_MYTHS.map((myth) => {
            const metric = GESTES_PROPRES_BAROMETER_2025.categories.false_beliefs.find(
              (item) => item.id === myth.metricId,
            );
            const isOpen = openId === myth.id;
            const buttonId = `${baseId}-button-${myth.id}`;
            const panelId = `${baseId}-panel-${myth.id}`;

            return (
              <CmmCard
                key={myth.id}
                tone="amber"
                variant={isOpen ? "elevated" : "outlined"}
                className="overflow-hidden p-0"
              >
                <button
                  type="button"
                  id={buttonId}
                  aria-controls={panelId}
                  aria-expanded={isOpen}
                  onClick={() => setOpenId(isOpen ? null : myth.id)}
                  className="flex w-full items-start justify-between gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-inset"
                >
                  <div className="space-y-1">
                    <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                      {locale === "fr" ? "Idée reçue" : "Misconception"}
                    </p>
                    <h4 className="text-lg font-black tracking-tight cmm-text-primary">{myth.question[locale]}</h4>
                    <p className="cmm-text-caption font-semibold uppercase tracking-[0.16em] text-amber-700">
                      {metric?.value ?? "?"} % · Page {myth.sourcePage}
                    </p>
                  </div>

                  <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                  </span>
                </button>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                  className="border-t border-amber-100 p-4"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1.15rem] border border-amber-100 bg-white px-3 py-3">
                      <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
                        {locale === "fr" ? "Réponse courte" : "Short answer"}
                      </p>
                      <p className="mt-1 cmm-text-small leading-relaxed cmm-text-primary">{myth.answer[locale]}</p>
                    </div>

                    <div className="rounded-[1.15rem] border border-amber-100 bg-amber-50/50 px-3 py-3">
                      <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
                        {locale === "fr" ? "Bon geste" : "Good gesture"}
                      </p>
                      <p className="mt-1 cmm-text-small leading-relaxed cmm-text-primary">{myth.goodGesture[locale]}</p>
                    </div>
                  </div>

                  <p className="mt-3 rounded-[1.15rem] border border-amber-100 bg-white px-3 py-3 cmm-text-small leading-relaxed cmm-text-secondary">
                    {GESTES_PROPRES_BAROMETER_2025.categories.false_beliefs.find((item) => item.id === myth.metricId)?.interpretationLimit[locale] ??
                      (locale === "fr"
                        ? "Cette idée reçue décrit une croyance déclarée, pas un comportement observé."
                        : "This misconception describes a declared belief, not an observed behavior.")}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="cmm-text-caption font-semibold uppercase tracking-[0.16em] text-amber-700">
                      {locale === "fr"
                        ? `Source : ${GESTES_PROPRES_BAROMETER_2025.organization[locale]} · ${GESTES_PROPRES_BAROMETER_2025.fieldworkPeriod[locale]}`
                        : `Source: ${GESTES_PROPRES_BAROMETER_2025.organization[locale]} · ${GESTES_PROPRES_BAROMETER_2025.fieldworkPeriod[locale]}`}
                    </p>

                    <CmmButton
                      href={myth.ctaHref}
                      tone="secondary"
                      variant="pill"
                      className="min-h-11 px-4 py-2.5 cmm-text-caption font-black uppercase tracking-[0.16em]"
                    >
                      {myth.ctaLabel[locale]}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </CmmButton>
                  </div>
                </div>
              </CmmCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
