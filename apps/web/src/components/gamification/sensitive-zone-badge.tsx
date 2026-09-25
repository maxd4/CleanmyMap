import { ShieldCheck } from "lucide-react";
import type { SensitiveZoneApaisementSummary } from "@/lib/gamification/sensitive-zone-badge";

type SensitiveZoneBadgeProps = {
  summary: SensitiveZoneApaisementSummary;
};

export function SensitiveZoneBadge({ summary }: SensitiveZoneBadgeProps) {
  const topSensitiveArea = summary.sensitiveAreas[0] ?? null;

  return (
    <article className="rounded-2xl border border-amber-200/18 bg-slate-950/45 p-5 text-white shadow-sm">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-100">
        <ShieldCheck size={15} aria-hidden="true" />
        Repère historique de zone sensible
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        {summary.eligibleValidatedActions} action(s) validée(s) disposent d&apos;une preuve figée au moment de la validation.
        Ce repère n&apos;est pas une progression infinie.
      </p>
      <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
        <div>
          <p className="text-slate-500">Qualification</p>
          <p className="mt-1 font-bold text-white">{summary.currentGrade.label}</p>
        </div>
        <div>
          <p className="text-slate-500">Zones repérées</p>
          <p className="mt-1 font-bold text-white">{summary.sensitiveAreaCount}</p>
        </div>
        <div>
          <p className="text-slate-500">Zone repère</p>
          <p className="mt-1 font-bold text-white">{topSensitiveArea ?? "Aucune"}</p>
        </div>
      </div>
    </article>
  );
}
