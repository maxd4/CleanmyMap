import type { ActionDistributionEntry } from "@/lib/accueil/action-participant-aggregation";

type ParticipantsDistributionProps = {
  distribution: readonly ActionDistributionEntry[];
};

const SEGMENT_COLORS = [
  "#087f5b",
  "#0ea5a4",
  "#3b82f6",
  "#f59e0b",
  "#db2777",
  "#7c3aed",
  "#64748b",
] as const;

function formatActionCount(count: number): string {
  return `${count.toLocaleString("fr-FR")} action${count > 1 ? "s" : ""}`;
}

function buildDonutBackground(
  entries: readonly ActionDistributionEntry[],
  total: number,
): string {
  let cursor = 0;
  const segments = entries.map((entry, index) => {
    const next = cursor + (entry.count / total) * 100;
    const segment = `${SEGMENT_COLORS[index % SEGMENT_COLORS.length]} ${cursor}% ${next}%`;
    cursor = next;
    return segment;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

export function ParticipantsDistribution({
  distribution,
}: ParticipantsDistributionProps) {
  const entries = distribution.filter(
    (entry) => entry.category.trim().length > 0 && entry.count > 0,
  );
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);

  if (entries.length === 0 || total <= 0) {
    return (
      <p className="rounded-xl border border-[#b8ded0] bg-white/55 px-3 py-2 text-[10px] font-medium leading-4 text-[#41675e]">
        Répartition des actions indisponible pour le moment.
      </p>
    );
  }

  return (
    <div className="grid min-h-24 grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 rounded-xl border border-[#b8ded0] bg-white/55 p-3">
      <div
        className="relative h-20 w-20 rounded-full"
        role="img"
        aria-label={`Répartition de ${formatActionCount(total)} par type d'organisateur`}
        style={{ background: buildDonutBackground(entries, total) }}
      >
        <span
          className="absolute inset-[0.55rem] rounded-full bg-[#f7fffb]"
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#0b7758]">
          {formatActionCount(total)}
        </p>
        <ul className="mt-1 max-h-28 space-y-0.5 overflow-y-auto pr-1 text-[10px] font-semibold leading-4 text-[#14334a]">
          {entries.map((entry, index) => (
            <li key={entry.key} className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    SEGMENT_COLORS[index % SEGMENT_COLORS.length],
                }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate">{entry.category}</span>
              <span className="shrink-0 tabular-nums">
                {entry.count.toLocaleString("fr-FR")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
