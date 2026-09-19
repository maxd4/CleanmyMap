"use client";

import type { EnvironmentalImpactSnapshotRecord } from "@/lib/environmental-impact-estimator";
import { cn } from "@/lib/utils";

type MonthlyImpactHistoryChartProps = {
  snapshots: EnvironmentalImpactSnapshotRecord[];
  launchedAt: string | null;
  generatedAt: string | null;
  className?: string;
};

type MonthlyPoint = {
  monthKey: string;
  monthLabel: string;
  date: Date;
  pollutionKg: number | null;
  aiKg: number | null;
  aiKwh: number | null;
  aiKm: number | null;
  aiWaterLiters: number | null;
};

type Point = { x: number; y: number };


function formatNumber(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
  }).format(value);
}

function formatKg(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "NA";
  }

  return `${formatNumber(value, 2)} kgCO2e`;
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function toUtcDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function buildMonthRange(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  let cursor = startOfUtcMonth(start);
  const stop = startOfUtcMonth(end);

  while (cursor.getTime() <= stop.getTime()) {
    months.push(cursor);
    cursor = addUtcMonths(cursor, 1);
  }

  return months;
}

function buildPoints(
  snapshots: EnvironmentalImpactSnapshotRecord[],
  launchedAt: string | null,
  generatedAt: string | null,
): MonthlyPoint[] {
  const generatedDate = toUtcDate(generatedAt) ?? new Date();
  const launchDate = toUtcDate(launchedAt);
  const chronologicalSnapshots = [...snapshots].sort((left, right) => {
    const leftTime = new Date(left.snapshotDate).getTime();
    const rightTime = new Date(right.snapshotDate).getTime();
    return leftTime - rightTime;
  });

  const monthlySnapshotMap = new Map<string, EnvironmentalImpactSnapshotRecord>();
  for (const snapshot of chronologicalSnapshots) {
    const monthKey = snapshot.snapshotDate.slice(0, 7);
    monthlySnapshotMap.set(monthKey, snapshot);
  }

  const monthAnchor = launchDate ?? (chronologicalSnapshots[0] ? toUtcDate(chronologicalSnapshots[0].snapshotDate) : null);
  const startDate = monthAnchor ?? generatedDate;
  const months = buildMonthRange(startDate, generatedDate);

  return months.map((monthDate) => {
    const monthKey = monthDate.toISOString().slice(0, 7);
    const snapshot = monthlySnapshotMap.get(monthKey) ?? null;

    return {
      monthKey,
      monthLabel: formatMonthLabel(monthDate),
      date: monthDate,
      pollutionKg: snapshot?.monthlyKgCo2eProxy ?? null,
      aiKg: null,
      aiKwh: null,
      aiKm: null,
      aiWaterLiters: null,
    };
  });
}

function buildPath(points: Point[]): string {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function buildSegments(points: Array<Point | null>): Point[][] {
  const segments: Point[][] = [];
  let current: Point[] = [];

  for (const point of points) {
    if (!point) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
      continue;
    }

    current.push(point);
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments;
}

function formatAxisKg(value: number): string {
  return `${formatNumber(value, 1)} kg`;
}

export function MonthlyImpactHistoryChart({
  snapshots,
  launchedAt,
  generatedAt,
  className,
}: MonthlyImpactHistoryChartProps) {
  const points = buildPoints(snapshots, launchedAt, generatedAt);
  const pollutionValues = points.map((point) => point.pollutionKg).filter((value): value is number => typeof value === "number");
  const aiValues = points.map((point) => point.aiKg).filter((value): value is number => typeof value === "number");
  const maxValue = Math.max(1, ...pollutionValues, ...aiValues);
  const hasPollutionData = pollutionValues.length > 0;
  const hasAiData = aiValues.length > 0;
  const width = 1000;
  const height = 360;
  const padding = { top: 28, right: 28, bottom: 72, left: 72 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const pointCount = Math.max(1, points.length);
  const pollutionPoints = points.map((point, index) => {
    if (point.pollutionKg === null) {
      return null;
    }

    return {
      x: padding.left + (pointCount === 1 ? chartWidth / 2 : (index / (pointCount - 1)) * chartWidth),
      y: padding.top + chartHeight - (point.pollutionKg / maxValue) * chartHeight,
    };
  });
  const aiPoints = points.map((point, index) => {
    if (point.aiKg === null) {
      return null;
    }

    return {
      x: padding.left + (pointCount === 1 ? chartWidth / 2 : (index / (pointCount - 1)) * chartWidth),
      y: padding.top + chartHeight - (point.aiKg / maxValue) * chartHeight,
    };
  });
  const pollutionSegments = buildSegments(pollutionPoints);
  const aiSegments = buildSegments(aiPoints);
  const latestPoint = points.at(-1) ?? null;
  const totalAiKg = aiValues.reduce((acc, value) => acc + value, 0);
  const axisTicks = points.length <= 5 ? points : [points[0], points[Math.floor(points.length / 2)], points.at(-1) ?? points[0]];
  const hasAnyData = hasPollutionData || hasAiData;
  const totalAiKgValue = hasAiData ? totalAiKg : null;

  return (
    <figure
      id="impact-history"
      className={cn(
        "overflow-hidden rounded-[3rem] border border-white/10 bg-white/5 p-6 shadow-[0_16px_48px_rgba(17,24,39,0.08)] md:p-8",
        className,
      )}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
<p className="cmm-text-caption font-black uppercase tracking-[0.28em] text-red-400/60">
            Historique mensuel
          </p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            Courbe de pollution et impact IA de développement
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            La courbe pleine suit l&apos;historique mensuel réellement enregistré dans la table Supabase
            <span className="font-semibold text-slate-800"> environmental_impact_snapshots</span>.
            Aucune courbe IA mensuelle n&apos;est reconstruite : l&apos;usage exact ChatGPT hors Codex est
            NA et le modèle central n&apos;est pas réparti par mois sans mesure dédiée.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[28rem]">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/70 px-4 py-3 shadow-sm">
<p className="cmm-text-caption font-black uppercase tracking-[0.2em] text-slate-500">
              Dernier mois enregistré
            </p>
            <p className="mt-1 text-xl font-black text-slate-950">{formatKg(latestPoint?.pollutionKg ?? null)}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {latestPoint ? latestPoint.monthLabel : "NA"}
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/70 px-4 py-3 shadow-sm">
<p className="cmm-text-caption font-black uppercase tracking-[0.2em] text-slate-500">
              Impact IA mensuel reconstruit
            </p>
            <p className="mt-1 text-xl font-black text-slate-950">{formatKg(totalAiKgValue)}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Usage exact ChatGPT hors Codex non audité
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="overflow-hidden rounded-[2.25rem] border border-slate-200 bg-[#fff9fa]">
          {hasAnyData ? (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-[320px] w-full"
              role="img"
              aria-label="Courbe mensuelle de pollution enregistrée et d'impact IA de développement"
            >
              <defs>
                <linearGradient id="pollution-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {[0, 1, 2, 3, 4].map((step) => {
                const y = padding.top + (chartHeight / 4) * step;
                const value = maxValue - (maxValue / 4) * step;

                return (
                  <g key={step}>
                    <line
                      x1={padding.left}
                      x2={width - padding.right}
                      y1={y}
                      y2={y}
                      stroke="rgba(15, 23, 42, 0.08)"
                      strokeDasharray={step === 4 ? "0" : "6 8"}
                    />
                    <text
                      x={padding.left - 12}
                      y={y + 4}
                      textAnchor="end"
className="fill-slate-500 cmm-text-caption font-bold"
                    >
                      {formatAxisKg(value)}
                    </text>
                  </g>
                );
              })}

              {pollutionSegments.map((segment, index) => (
                <g key={`pollution-${index}`}>
                  <path
                    d={`${buildPath([
                      { x: segment[0].x, y: padding.top + chartHeight },
                      ...segment,
                      { x: segment[segment.length - 1].x, y: padding.top + chartHeight },
                    ])} Z`}
                    fill="url(#pollution-fill)"
                  />
                  <path
                    d={buildPath(segment)}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              ))}

              {aiSegments.map((segment, index) => (
                <path
                  key={`ai-${index}`}
                  d={buildPath(segment)}
                  fill="none"
                  stroke="#fb7185"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="10 8"
                  opacity="0.9"
                />
              ))}

              {pollutionPoints.map((point, index) =>
                point ? (
                  <circle
                    key={`pollution-point-${points[index]?.monthKey ?? index}`}
                    cx={point.x}
                    cy={point.y}
                    r={5}
                    fill="#fff"
                    stroke="#ef4444"
                    strokeWidth="4"
                  />
                ) : null,
              )}

              {aiPoints.map((point, index) =>
                point ? (
                  <circle
                    key={`ai-point-${points[index]?.monthKey ?? index}`}
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    fill="#fff"
                    stroke="#fb7185"
                    strokeWidth="3.5"
                  />
                ) : null,
              )}

              {axisTicks.map((point) => {
                if (!point) {
                  return null;
                }

                const matchingIndex = points.findIndex((candidate) => candidate.monthKey === point.monthKey);
                const xPoint = pollutionPoints[matchingIndex] ?? aiPoints[matchingIndex];

                if (!xPoint) {
                  return null;
                }

                return (
                  <g key={`axis-${point.monthKey}`}>
                    <line
                      x1={xPoint.x}
                      x2={xPoint.x}
                      y1={padding.top + chartHeight}
                      y2={padding.top + chartHeight + 10}
                      stroke="rgba(15, 23, 42, 0.22)"
                    />
                    <text
                      x={xPoint.x}
                      y={padding.top + chartHeight + 32}
                      textAnchor="middle"
className="fill-slate-500 cmm-text-caption font-bold"
                    >
                      {point.monthLabel}
                    </text>
                  </g>
                );
              })}

              <text
                x={padding.left}
                y={height - 18}
className="fill-slate-500 cmm-text-caption font-black uppercase tracking-[0.18em]"
              >
                Mois
              </text>
              <text
                x={width - padding.right}
                y={20}
                textAnchor="end"
className="fill-slate-500 cmm-text-caption font-black uppercase tracking-[0.18em]"
              >
                kgCO2e mensuels
              </text>
            </svg>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
<div className="rounded-full border border-red-200 bg-red-50 px-4 py-1 cmm-text-caption font-black uppercase tracking-[0.22em] text-red-500">
                NA
              </div>
              <p className="max-w-lg text-sm leading-relaxed text-slate-600">
                Aucun historique mensuel d&apos;impact n&apos;est encore enregistré pour ce projet.
                La courbe apparaîtra automatiquement dès qu&apos;un snapshot mensuel Supabase sera disponible.
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div>
<p className="cmm-text-caption font-black uppercase tracking-[0.22em] text-slate-500">Légende</p>
            <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">
              Lecture du graphique
            </h3>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-[#fff9fa] p-4">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-red-500" />
                <div>
                  <p className="text-sm font-bold text-slate-950">Pollution mensuelle enregistrée</p>
                  <p className="text-xs text-slate-500">
                    {hasPollutionData ? "Courbe issue des snapshots Supabase" : "NA"}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm font-black text-slate-950">{formatKg(latestPoint?.pollutionKg ?? null)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-[#fff9fa] p-4">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full border-2 border-[#fb7185] bg-white" />
                <div>
                  <p className="text-sm font-bold text-slate-950">Impact IA de développement</p>
                  <p className="text-xs text-slate-500">NA — aucune répartition mensuelle auditable</p>
                </div>
              </div>
              <p className="mt-3 text-sm font-black text-slate-950">{formatKg(totalAiKgValue)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
<p className="cmm-text-caption font-black uppercase tracking-[0.22em] text-slate-500">
                Base de calcul IA
              </p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                Le modèle central IA est compté sur la période globale; il n&apos;est pas réparti par mois.
              </p>
              <div className="mt-3 space-y-1 text-sm text-slate-700">
                <p>ChatGPT hors Codex : usage exact NA</p>
                <p>Énergie, CO2e et eau mensuels : NA</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </figure>
  );
}
