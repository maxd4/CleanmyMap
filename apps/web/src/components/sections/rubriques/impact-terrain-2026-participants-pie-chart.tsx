import type { CSSProperties } from "react";
import type { ActionDistributionEntry } from "@/lib/accueil/action-participant-aggregation";

const CATEGORY_COLORS = [
  "#fca5a5",
  "#fcd34d",
  "#86efac",
  "#67e8f9",
  "#a5b4fc",
  "#f9a8d4",
  "#c4b5fd",
] as const;

export function ImpactTerrain2026ParticipantsPieChart({
  distribution,
  participantsTotal,
  isFrench,
}: {
  distribution: readonly ActionDistributionEntry[];
  participantsTotal: number;
  isFrench: boolean;
}) {
  const entries = distribution
    .filter((entry) => entry.count > 0)
    .map((entry, index) => ({
      ...entry,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  let cursor = 0;
  const gradientStops = entries.map((entry) => {
    const start = cursor;
    cursor += (entry.count / (total || 1)) * 100;
    return `${entry.color} ${start}% ${cursor}%`;
  });
  const chartStyle = {
    background:
      total > 0
        ? `conic-gradient(${gradientStops.join(", ")})`
        : "conic-gradient(#334155 0 100%)",
  } satisfies CSSProperties;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center gap-5">
        <div
          aria-label={
            isFrench
              ? "Répartition des actions par catégorie"
              : "Action distribution by category"
          }
          className="relative h-32 w-32 shrink-0 rounded-full p-3"
          role="img"
          style={chartStyle}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950 text-center">
            <span className="text-xs font-black text-white">
              {participantsTotal.toLocaleString("fr-FR")}
              <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {isFrench ? "participants" : "participants"}
              </span>
            </span>
          </div>
        </div>

        <div className="min-w-[12rem] flex-1 space-y-2">
          {entries.length > 0 ? (
            entries.map((entry) => (
              <div key={entry.key} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.category}
                </span>
                <span className="font-black text-white">{entry.count.toLocaleString("fr-FR")}</span>
              </div>
            ))
          ) : (
            <p className="text-xs leading-relaxed text-slate-400">
              {isFrench
                ? "Aucune action classée n’est disponible dans l’agrégat public chargé."
                : "No classified action is available in the loaded public aggregate."}
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
        {isFrench
          ? "Chaque action éligible apparaît une seule fois. Les actions spontanées sont classées selon le nombre de participants ; les structures sont classées selon leur type canonique."
          : "Each eligible action appears once. Spontaneous actions are classified by participant count; structured actions use their canonical organizer type."}
      </p>
    </div>
  );
}
