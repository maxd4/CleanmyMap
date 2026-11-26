import { ArrowRight } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type { GamificationSummary } from "@/lib/gamification/progression/gamification-summary";

export type ProfileGamificationSummaryProps = {
  summary: GamificationSummary | null | undefined;
};

export function ProfileGamificationSummary({
  summary,
}: ProfileGamificationSummaryProps) {
  return (
    <section
      aria-labelledby="profile-gamification-summary-title"
      data-testid="profile-gamification-summary"
      className="space-y-3"
    >
      <CmmCard className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] cmm-text-secondary">
            Résumé de progression
          </p>
          <h2
            id="profile-gamification-summary-title"
            className="mt-1 text-lg font-black tracking-tight cmm-text-primary"
          >
            Votre progression actuelle
          </h2>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-current/10 px-4 py-3">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] cmm-text-secondary">
              Niveau actuel
            </dt>
            <dd className="mt-1 text-xl font-black cmm-text-primary">
              {summary?.currentLevel ?? "—"}
            </dd>
          </div>
          <div className="rounded-xl border border-current/10 px-4 py-3">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] cmm-text-secondary">
              XP totale
            </dt>
            <dd className="mt-1 text-xl font-black cmm-text-primary">{summary?.xpTotal ?? "—"}</dd>
          </div>
          <div className="rounded-xl border border-current/10 px-4 py-3">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] cmm-text-secondary">
              Niveau potentiel
            </dt>
            <dd className="mt-1 truncate text-base font-black cmm-text-primary">
              {summary?.potentialLevel ?? "—"}
            </dd>
          </div>
          <div className="rounded-xl border border-current/10 px-4 py-3">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] cmm-text-secondary">
              Progressions actives
            </dt>
            <dd className="mt-1 truncate text-base font-black cmm-text-primary">
              {summary?.progressions.filter((progression) => progression.state === "in_progress").length ?? "—"}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3 border-t border-current/10 pt-4 sm:flex-row sm:flex-wrap">
          <CmmButton
            href="/profil/impact"
            tone="secondary"
            variant="pill"
            className="w-full justify-center gap-2 px-5 text-sm font-black sm:w-auto"
          >
            Voir ma carte d’impact
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </CmmButton>
          <CmmButton
            href="/sections/gamification"
            tone="secondary"
            variant="pill"
            className="w-full justify-center gap-2 px-5 text-sm font-black sm:w-auto"
          >
            Voir toute ma progression
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </CmmButton>
        </div>
      </CmmCard>
    </section>
  );
}
