"use client";

import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { PageHeader } from "@/components/ui/page-header";

export function FeedbackHeader() {
  const { locale } = useSitePreferences();

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          locale === "fr"
            ? "Un canal unique pour corriger, améliorer et collaborer."
            : "A single channel to fix, improve and collaborate."
        }
        subtitle={
          locale === "fr"
            ? "Choisis le questionnaire adapté: bug, amélioration ou collaboration. Chaque réponse est enregistrée dans le suivi CleanMyMap avec un vrai contexte."
            : "Choose the right questionnaire: bug, improvement or collaboration. Each answer is recorded in the CleanMyMap follow-up with real context."
        }
        action={
          <CmmButtonGroup>
            <CmmButton href="#bug" tone="primary" variant="pill">
              {locale === "fr" ? "Signalement bug" : "Bug report"}
            </CmmButton>
            <CmmButton href="#improvement" tone="secondary" variant="pill">
              {locale === "fr" ? "Amélioration" : "Improvement"}
            </CmmButton>
            <CmmButton href="#collaboration" tone="secondary" variant="pill">
              Collaboration
            </CmmButton>
          </CmmButtonGroup>
        }
      />

      <CmmCard
        tone="family"
        variant="default"
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Bugs",
              value: locale === "fr" ? "Réparation priorisée" : "Priority fix",
            },
            {
              label: locale === "fr" ? "Améliorations" : "Improvements",
              value: locale === "fr" ? "Itérations utiles" : "Useful iterations",
            },
            {
              label: "Collaborations",
              value: locale === "fr" ? "Mise en lien" : "Warm introduction",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="cmm-surface cmm-panel p-4"
            >
              <p className="cmm-text-caption font-semibold uppercase tracking-[0.18em] text-[var(--cmm-family-heading,var(--text-primary))]">
                {item.label}
              </p>
              <p className="mt-2 text-sm font-medium cmm-text-primary">{item.value}</p>
            </div>
          ))}
        </div>
      </CmmCard>
    </div>
  );
}
