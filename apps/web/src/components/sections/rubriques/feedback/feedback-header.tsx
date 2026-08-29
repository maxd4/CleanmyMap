"use client";

import { ShieldAlert } from "lucide-react";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { PageHeader } from "@/components/ui/page-header";

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
          <PageHeader
            contrast="inverse"
            title={
              <span className="inline-flex items-center gap-3">
                <ShieldAlert className="h-6 w-6 text-cyan-300" aria-hidden="true" />
                <span>
                  {locale === "fr"
                    ? "Un canal unique pour corriger, améliorer et collaborer."
                    : "A single channel to fix, improve and collaborate."}
                </span>
              </span>
            }
            subtitle={
              locale === "fr"
                ? "Choisis le questionnaire adapté: bug, amélioration ou collaboration. Chaque réponse est enregistrée dans le suivi CleanMyMap avec un vrai contexte."
                : "Choose the right questionnaire: bug, improvement or collaboration. Each answer is recorded in the CleanMyMap follow-up with real context."
            }
          />

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
