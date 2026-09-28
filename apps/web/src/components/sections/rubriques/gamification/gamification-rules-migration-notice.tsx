"use client";

import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { GamificationSummary } from "@/lib/gamification/gamification-summary";

export function GamificationRulesMigrationNotice({
  summary,
  locale,
  onAcknowledged,
}: {
  summary: GamificationSummary | undefined;
  locale: string;
  onAcknowledged: () => Promise<void> | void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fr = locale === "fr";
  if (!summary?.rulesMigration.hasUnacknowledgedChanges) return null;

  const newProgressions = summary.progressions.filter((item) => item.isNewSinceLastRulesMigration).length;
  const newMilestones = summary.milestones.filter((item) => item.isNewSinceLastRulesMigration).length;

  async function acknowledge() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/gamification/me/acknowledge-rules-migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(fr ? "Impossible d’enregistrer l’acquittement." : "Unable to save acknowledgement.");
      await onAcknowledged();
    } catch (acknowledgementError) {
      setError(acknowledgementError instanceof Error ? acknowledgementError.message : "Erreur inattendue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[1.75rem] border border-[#e9c48f] bg-[#fffaf0] p-5 shadow-[0_12px_34px_rgba(126,31,20,0.06)]" aria-live="polite">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a5a16]">
            {fr ? "Évolution des règles" : "Rules update"}
          </p>
          <h2 className="mt-1 text-lg font-black text-[#2c1a17]">
            {fr ? "De nouvelles mécaniques sont disponibles" : "New mechanics are available"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#765f59]">
            {fr
              ? `${newProgressions} progression${newProgressions > 1 ? "s" : ""} et ${newMilestones} jalon${newMilestones > 1 ? "s" : ""} ont été ajoutés dans la révision ${summary.rulesMigration.currentAppliedRulesRevision}.`
              : `${newProgressions} progression${newProgressions === 1 ? "" : "s"} and ${newMilestones} milestone${newMilestones === 1 ? "" : "s"} were added in revision ${summary.rulesMigration.currentAppliedRulesRevision}.`}
          </p>
        </div>
        <CmmButton
          type="button"
          tone="primary"
          variant="pill"
          size="md"
          loading={isSubmitting}
          onClick={acknowledge}
        >
          {fr ? "J’ai vu les nouveautés" : "I’ve seen the updates"}
        </CmmButton>
      </div>
      {error ? <p className="mt-3 text-sm font-semibold text-[#b4362e]" role="alert">{error}</p> : null}
    </section>
  );
}
