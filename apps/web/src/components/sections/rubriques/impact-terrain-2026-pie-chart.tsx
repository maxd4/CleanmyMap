import type { CSSProperties } from "react";

export type ImpactTerrainPieChartEntry = {
  key: string;
  label: string;
  count: number;
  color: string;
};

export function ImpactTerrain2026PieChart({
  entries,
  displayTotal,
  totalLabel,
  ariaLabel,
  emptyMessage,
  footerMessage,
}: {
  entries: readonly ImpactTerrainPieChartEntry[];
  displayTotal: number | string;
  totalLabel: string;
  ariaLabel: string;
  emptyMessage: string;
  footerMessage: string;
}) {
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
    <div className="rounded-2xl border border-rose-100 bg-white p-4">
      <div className="flex flex-wrap items-center gap-5">
        <div
          aria-label={ariaLabel}
          className="relative h-32 w-32 shrink-0 rounded-full p-3"
          role="img"
          style={chartStyle}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-rose-50 text-center">
            <span className="text-xs font-black text-rose-950">
              {typeof displayTotal === "number" ? displayTotal.toLocaleString("fr-FR") : displayTotal}
              <span className="block cmm-text-caption font-semibold uppercase tracking-[0.12em] text-rose-700">
                {totalLabel}
              </span>
            </span>
          </div>
        </div>

        <div className="min-w-[12rem] flex-1 space-y-2">
          {entries.length > 0 ? (
            entries.map((entry) => (
              <div key={entry.key} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 cmm-text-body">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.label}
                </span>
                <span className="font-black text-rose-800">{entry.count.toLocaleString("fr-FR")}</span>
              </div>
            ))
          ) : (
            <p className="text-xs leading-relaxed cmm-text-small">{emptyMessage}</p>
          )}
        </div>
      </div>

      <p className="mt-4 cmm-text-caption leading-relaxed cmm-text-small">{footerMessage}</p>
    </div>
  );
}
