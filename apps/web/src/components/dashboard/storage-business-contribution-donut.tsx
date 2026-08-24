"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { formatStorageBytes } from "@/lib/supabase/storage-usage";
import type { StorageBusinessContributionReport } from "@/lib/supabase/storage-business-contribution";
import {
  buildStorageBusinessContributionDonutViewModel,
  formatMonthReference,
  formatPercent,
  formatSignedPercent,
  getModeDeltaLabel,
  getModeDescription,
  getModeLabel,
  getModeValueLabel,
  type ContributionChartItem,
  type ContributionMetricMode,
} from "@/lib/dashboard/storage-business-contribution-donut-view-model";

function ChartTooltip({
  active,
  payload,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ payload: ContributionChartItem }>;
  mode: ContributionMetricMode;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0]?.payload;
  if (!item) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950 px-4 py-3 shadow-2xl">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
        {item.label}
      </p>
      <p className="mt-2 text-lg font-black text-white">{getModeValueLabel(mode, item.value)}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
        {formatPercent(item.sharePercent)}% du total
      </p>
      <div className="mt-3 space-y-1 text-[11px] font-semibold text-white/75">
        <p>Mois précédent: {getModeValueLabel(mode, item.previousValue)}</p>
        <p
          className={cn(
            item.deltaValue > 0
              ? "text-rose-200"
              : item.deltaValue < 0
                ? "text-emerald-200"
                : "text-white/60",
          )}
        >
          Évolution: {getModeDeltaLabel(mode, item.deltaValue)} ·{" "}
          {formatSignedPercent(item.deltaPercent)}
        </p>
      </div>
    </div>
  );
}

function ContributionSummaryCard({
  item,
  previousSnapshotMonth,
  mode,
}: {
  item: ContributionChartItem | null;
  previousSnapshotMonth: string | null;
  mode: ContributionMetricMode;
}) {
  if (!item) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-4 text-sm text-white/35">
        Aucune catégorie métier n&apos;est encore alimentée.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/5 bg-slate-950/35 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
            Détail sélectionné
          </p>
          <h4 className="mt-1 truncate text-lg font-black text-white">{item.label}</h4>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
            Mois N-1: {formatMonthReference(previousSnapshotMonth)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-white">{getModeValueLabel(mode, item.value)}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
            {formatPercent(item.sharePercent)}% du total
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/5 bg-white/5 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
            {mode === "pressure" ? "Score brut" : "Volume absolu"}
          </p>
          <p className="mt-1 text-sm font-black text-white">
            {getModeValueLabel(mode, item.value)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
            Part relative
          </p>
          <p className="mt-1 text-sm font-black text-white">{formatPercent(item.sharePercent)}%</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
            Évolution mensuelle
          </p>
          <p
            className={cn(
              "mt-1 text-sm font-black",
              item.deltaValue > 0
                ? "text-rose-200"
                : item.deltaValue < 0
                  ? "text-emerald-200"
                  : "text-white",
            )}
          >
            {getModeDeltaLabel(mode, item.deltaValue)}
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
            {formatSignedPercent(item.deltaPercent)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function StorageBusinessContributionDonut({
  report,
  compact = false,
  className,
}: {
  report: StorageBusinessContributionReport;
  compact?: boolean;
  className?: string;
}) {
  const [mode, setMode] = useState<ContributionMetricMode>("storage");

  const {
    data,
    currentTotalValue,
    previousTotalValue,
    deltaValue,
    leadingItem,
    leadingDelta,
    modeColors,
  } = useMemo(() => buildStorageBusinessContributionDonutViewModel(report, mode), [mode, report]);

  const [selectedKey, setSelectedKey] = useState<string | null>(data[0]?.key ?? null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const selectedItem =
    data.find((item) => item.key === (hoveredKey ?? selectedKey)) ?? data[0] ?? null;

  return (
    <section className={cn("rounded-3xl border border-white/5 bg-white/5 p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
            Camembert mensuel
          </p>
          <p className={cn("mt-1 text-sm text-white/50", compact && "max-w-xl")}>
            {getModeDescription(mode)}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 text-right">
          <div className="inline-flex rounded-full border border-white/8 bg-slate-950/40 p-1">
            {(["storage", "pressure"] as const).map((itemMode) => (
              <button
                key={itemMode}
                type="button"
                onClick={() => setMode(itemMode)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] transition",
                  mode === itemMode
                    ? "bg-white text-slate-950"
                    : "text-white/45 hover:bg-white/5 hover:text-white",
                )}
              >
                {getModeLabel(itemMode)}
              </button>
            ))}
          </div>

          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
            {report.previousSnapshotMonth ? `Comparé à ${formatMonthReference(report.previousSnapshotMonth)}` : "Pas de mois N-1"}
          </div>
        </div>
      </div>

      {mode === "pressure" ? (
        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
          La pression est un proxy de pilotage calculé à partir du volume, de la croissance et de
          l&apos;accélération.
        </p>
      ) : null}

      <div
        className={cn(
          "mt-4 grid gap-4",
          compact ? "lg:grid-cols-[240px_1fr]" : "xl:grid-cols-[280px_1fr]",
        )}
      >
        <div
          className={cn(
            "relative rounded-3xl border border-white/5 bg-slate-950/30 p-2",
            compact ? "h-56" : "h-72",
          )}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={compact ? 56 : 72}
                outerRadius={compact ? 88 : 112}
                paddingAngle={2}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
                onMouseLeave={() => setHoveredKey(null)}
                onMouseEnter={(_, index) => {
                  const item = data[index];
                  if (item) {
                    setHoveredKey(item.key);
                  }
                }}
                onClick={(_, index) => {
                  const item = data[index];
                  if (item) {
                    setSelectedKey(item.key);
                    setHoveredKey(item.key);
                  }
                }}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.key} fill={modeColors[index % modeColors.length]} />
                ))}
              </Pie>
              <Tooltip
                content={<ChartTooltip mode={mode} />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-3xl border border-white/5 bg-slate-950/75 px-4 py-3 text-center shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                {getModeLabel(mode)} totale
              </p>
              <p className="mt-2 text-xl font-black text-white">
                {mode === "pressure" ? `${Math.round(currentTotalValue)} pts` : formatStorageBytes(currentTotalValue)}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                {data.length} catégorie{data.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/25">
                Mois N vs N-1
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {deltaValue > 0 ? "+" : ""}
                {mode === "pressure" ? `${Math.round(deltaValue)} pts` : formatStorageBytes(deltaValue)}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                {previousTotalValue > 0
                  ? `${formatPercent((deltaValue / previousTotalValue) * 100)}%`
                  : "Base absente"}
              </p>
            </article>

            <article className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/25">
                Catégorie dominante
              </p>
              <p className="mt-2 text-lg font-black text-white">{leadingItem?.label ?? "n/a"}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                {leadingItem
                  ? `${mode === "pressure" ? `${Math.round(leadingItem.value)} pts` : formatStorageBytes(leadingItem.value)} · ${formatPercent(leadingItem.sharePercent)}%`
                  : "Aucune donnée"}
              </p>
            </article>
          </div>

          <ContributionSummaryCard
            item={selectedItem}
            previousSnapshotMonth={report.previousSnapshotMonth}
            mode={mode}
          />

          <div className={cn("grid gap-2", compact ? "md:grid-cols-2" : "xl:grid-cols-2")}>
            {data.map((item, index) => {
              const isSelected = item.key === selectedItem?.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedKey(item.key)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left transition",
                    isSelected
                      ? "border-sky-400/30 bg-sky-500/10 ring-1 ring-sky-400/20"
                      : "border-white/5 bg-slate-950/40 hover:border-white/10 hover:bg-slate-950/55",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: modeColors[index % modeColors.length] }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{item.label}</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                        {formatPercent(item.sharePercent)}% du total ·{" "}
                        {mode === "pressure" ? `${Math.round(item.value)} pts` : formatStorageBytes(item.value)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-xs font-black uppercase tracking-[0.18em]",
                        item.deltaValue > 0
                          ? "text-rose-300"
                          : item.deltaValue < 0
                            ? "text-emerald-300"
                            : "text-white/50",
                      )}
                    >
                      {mode === "pressure"
                        ? `${item.deltaValue > 0 ? "+" : ""}${Math.round(item.deltaValue)} pts`
                        : `${item.deltaValue > 0 ? "+" : ""}${formatStorageBytes(Math.abs(item.deltaValue))}`}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                      {formatSignedPercent(item.deltaPercent)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {leadingDelta ? (
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/25">
              Hausse la plus forte: {leadingDelta.label} ({getModeDeltaLabel(mode, leadingDelta.deltaValue)}).
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
