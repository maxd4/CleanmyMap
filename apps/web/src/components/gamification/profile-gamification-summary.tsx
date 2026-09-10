import { ArrowRight } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";

export type ProfileGamificationSummaryProps = {
  currentLevel: number | null;
  actionsCreated: number;
  regularityLabel: string;
  actionBalanceLabel: string;
};

export function ProfileGamificationSummary({
  currentLevel,
  actionsCreated,
  regularityLabel,
  actionBalanceLabel,
}: ProfileGamificationSummaryProps) {
  return (
    <section
      aria-labelledby="profile-gamification-summary-title"
      data-testid="profile-gamification-summary"
      className="rounded-2xl border border-amber-200/20 bg-[rgba(69,26,3,0.34)] p-5 shadow-[0_18px_36px_-28px_rgba(120,53,15,0.8)]"
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/80">
            Résumé de progression
          </p>
          <h2
            id="profile-gamification-summary-title"
            className="mt-1 text-lg font-black tracking-tight text-white"
          >
            Votre progression actuelle
          </h2>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-amber-200/14 bg-black/10 px-4 py-3">
            <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-100/65">
              Niveau actuel
            </dt>
            <dd className="mt-1 text-xl font-black text-white">
              {currentLevel === null ? "—" : currentLevel}
            </dd>
          </div>
          <div className="rounded-xl border border-amber-200/14 bg-black/10 px-4 py-3">
            <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-100/65">
              Actions créées
            </dt>
            <dd className="mt-1 text-xl font-black text-white">{actionsCreated}</dd>
          </div>
          <div className="rounded-xl border border-amber-200/14 bg-black/10 px-4 py-3">
            <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-100/65">
              Régularité
            </dt>
            <dd className="mt-1 truncate text-base font-black text-amber-100" title={regularityLabel}>
              {regularityLabel}
            </dd>
          </div>
          <div className="rounded-xl border border-amber-200/14 bg-black/10 px-4 py-3">
            <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-100/65">
              Équilibre des contextes
            </dt>
            <dd className="mt-1 truncate text-base font-black text-amber-100" title={actionBalanceLabel}>
              {actionBalanceLabel}
            </dd>
          </div>
        </dl>

        <div className="border-t border-amber-200/14 pt-4">
          <CmmButton
            href="/sections/gamification"
            tone="critical"
            variant="pill"
            className="w-full justify-center gap-2 px-5 text-sm font-black sm:w-auto"
          >
            Voir toute ma progression
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </CmmButton>
        </div>
      </div>
    </section>
  );
}
