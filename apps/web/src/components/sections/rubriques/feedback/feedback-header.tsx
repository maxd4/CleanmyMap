"use client";

import { ShieldAlert } from "lucide-react";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

export function FeedbackHeader() {
  const { locale } = useSitePreferences();

  return (
    <CmmCard
      tone="sky"
      variant="glass"
      size="lg"
      className="rounded-[2rem] border-cyan-300/20 bg-slate-950/35"
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-slate-100">
            <ShieldAlert className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <span className="cmm-text-caption font-semibold uppercase tracking-[0.22em]">
              {locale === "fr" ? "Rubrique feedback" : "Feedback section"}
            </span>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              {locale === "fr"
                ? "Un canal unique pour corriger, améliorer et collaborer."
                : "A single channel to fix, improve and collaborate."}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-slate-300">
              {locale === "fr"
                ? "Choisis le questionnaire adapté: bug, amélioration ou collaboration. Chaque réponse est enregistrée dans le suivi CleanMyMap avec un vrai contexte."
                : "Choose the right questionnaire: bug, improvement or collaboration. Each answer is recorded in the CleanMyMap follow-up with real context."}
            </p>
          </div>

          <CmmButtonGroup>
            <CmmButton href="#bug" tone="primary" variant="pill">
              {locale === "fr" ? "Signalement bug" : "Bug report"}
            </CmmButton>
            <CmmButton href="#improvement" tone="secondary" variant="pill">
              {locale === "fr" ? "Amélioration" : "Improvement"}
            </CmmButton>
            <CmmButton href="#collaboration" tone="secondary" variant="pill">
              {locale === "fr" ? "Collaboration" : "Collaboration"}
            </CmmButton>
          </CmmButtonGroup>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {[
            {
              label: locale === "fr" ? "Bugs" : "Bugs",
              value: locale === "fr" ? "Réparation priorisée" : "Priority fix",
            },
            {
              label: locale === "fr" ? "Améliorations" : "Improvements",
              value: locale === "fr" ? "Itérations utiles" : "Useful iterations",
            },
            {
              label: locale === "fr" ? "Collaborations" : "Collaborations",
              value: locale === "fr" ? "Mise en lien" : "Warm introduction",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <p className="cmm-text-caption font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
                {item.label}
              </p>
              <p className="mt-2 text-sm font-medium text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </CmmCard>
  );
}
