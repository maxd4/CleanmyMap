"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { EnvironmentalImpactInfrastructureEstimate } from "@/lib/environmental-impact-estimator";

type EnvironmentalImpactCurveChartProps = {
  infrastructure: EnvironmentalImpactInfrastructureEstimate;
  className?: string;
};

const SERVICE_COLORS: Record<string, string> = {
  vercel: "#fb7185",
  supabase: "#f97316",
  resend: "#f59e0b",
  clerk: "#22c55e",
  posthog: "#38bdf8",
  sentry: "#a78bfa",
  upstash: "#e879f9",
  pinecone: "#14b8a6",
  stripe: "#f43f5e",
  lwsDomain: "#fb923c",
};

function formatKg(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(value)} kg CO2e proxy`;
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value)} %`;
}

function formatSharePercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value)} %`;
}

export function EnvironmentalImpactCurveChart({
  infrastructure,
  className,
}: EnvironmentalImpactCurveChartProps) {
  const points = infrastructure.curve;
  const [selectedPointIndex, setSelectedPointIndex] = useState<number>(
    points.at(-1)?.index ?? 0,
  );
  useEffect(() => {
    setSelectedPointIndex(points.at(-1)?.index ?? 0);
  }, [points]);
  const width = 1000;
  const height = 360;
  const padding = { top: 28, right: 28, bottom: 64, left: 72 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(
    1,
    ...points.map((point) => point.cumulativeKgCo2eProxy),
  );

  const linePoints = points.map((point, index) => ({
    x:
      padding.left +
      (points.length <= 1 ? 0 : (index / (points.length - 1)) * chartWidth),
    y:
      padding.top +
      chartHeight -
      (point.cumulativeKgCo2eProxy / maxValue) * chartHeight,
  }));

  const lowerPoints = points.map((point, index) => ({
    x:
      padding.left +
      (points.length <= 1 ? 0 : (index / (points.length - 1)) * chartWidth),
    y:
      padding.top +
      chartHeight -
      (point.lowerKgCo2eProxy / maxValue) * chartHeight,
  }));

  const upperPoints = points.map((point, index) => ({
    x:
      padding.left +
      (points.length <= 1 ? 0 : (index / (points.length - 1)) * chartWidth),
    y:
      padding.top +
      chartHeight -
      (point.upperKgCo2eProxy / maxValue) * chartHeight,
  }));

  const areaPath = `${buildLinePath([
    { x: padding.left, y: padding.top + chartHeight },
    ...linePoints,
    { x: padding.left + chartWidth, y: padding.top + chartHeight },
  ])} Z`;
  const linePath = buildLinePath(linePoints);
  const uncertaintyBandPath = `${buildLinePath([
    ...upperPoints,
    ...[...lowerPoints].reverse(),
  ])} Z`;
  const selectedPoint =
    points.find((point) => point.index === selectedPointIndex) ?? points.at(-1) ?? null;
  const selectedPointTotal = Math.max(
    0,
    selectedPoint
      ? Object.values(selectedPoint.breakdown).reduce((acc, value) => acc + (value ?? 0), 0)
      : 0,
  );
  const selectedLinePoint =
    selectedPoint && selectedPoint.index < linePoints.length
      ? linePoints[selectedPoint.index]
      : null;
  const selectedServiceBreakdown = infrastructure.services
    .map((service) => {
      const value = selectedPoint?.breakdown[service.key] ?? 0;
      const sharePercent = selectedPointTotal > 0 ? (value / selectedPointTotal) * 100 : 0;

      return {
        ...service,
        value,
        sharePercent,
      };
    })
    .sort((a, b) => b.sharePercent - a.sharePercent || b.value - a.value);
  const topServices = [...infrastructure.services]
    .sort((a, b) => (b.monthlyKgCo2eProxy ?? 0) - (a.monthlyKgCo2eProxy ?? 0))
    .slice(0, 4);
  const midIndex = Math.floor((points.length - 1) / 2);
  const axisLabels =
    points.length > 2
      ? [points[0], points[midIndex], points.at(-1)!]
      : points;

  return (
    <figure
      className={cn(
        "overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20 p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
            Courbe temporelle
          </p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-white">
            {infrastructure.graph.title}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-red-100/45">
            Le tracé expose une projection hebdomadaire depuis la mise en ligne.
            Clique sur un point pour voir la répartition de la pollution par
            poste. Sans télémétrie complète, la ligne utilise des charges de
            référence pour Vercel, Supabase, Resend, Clerk, PostHog, Sentry,
            Upstash, Pinecone, Stripe et le domaine LWS.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/35">
            Impact cumulé
          </p>
          <p className="mt-1 text-lg font-black text-white">
            {formatKg(infrastructure.totalKgCo2eProxy)}
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
            Confiance {formatPercent(infrastructure.graph.confidencePercent)}
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#19090a]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[240px] w-full md:h-[300px]"
          role="img"
          aria-label="Courbe temporelle de l'impact environnemental proxy"
        >
          <defs>
            <linearGradient id="environmental-impact-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3].map((step) => {
            const y = padding.top + (chartHeight / 3) * step;
            return (
              <g key={step}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray={step === 3 ? "0" : "6 8"}
                />
                <text
                  x={padding.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-red-100/35 text-[11px] font-bold"
                >
                  {formatKg(maxValue - (maxValue / 3) * step)}
                </text>
              </g>
            );
          })}

          <path d={uncertaintyBandPath} fill="rgba(251, 113, 133, 0.08)" />
          <path d={areaPath} fill="url(#environmental-impact-fill)" />
          <path
            d={linePath}
            fill="none"
            stroke="#fb7185"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {selectedLinePoint ? (
            <line
              x1={selectedLinePoint.x}
              x2={selectedLinePoint.x}
              y1={padding.top}
              y2={padding.top + chartHeight}
              stroke="rgba(251, 113, 133, 0.45)"
              strokeDasharray="8 8"
            />
          ) : null}

          {linePoints.map((point, index) => (
            <circle
              key={`${points[index]?.date ?? index}`}
              cx={point.x}
              cy={point.y}
              r={
                points[index]?.index === selectedPointIndex
                  ? 8
                  : index === 0 || index === linePoints.length - 1
                    ? 6
                    : 4
              }
              fill={points[index]?.index === selectedPointIndex ? "#fb7185" : "#fff"}
              stroke={points[index]?.index === selectedPointIndex ? "#fff" : "#fb7185"}
              strokeWidth={points[index]?.index === selectedPointIndex ? "4.5" : "4"}
              style={{ cursor: "pointer" }}
              role="button"
              tabIndex={0}
              aria-label={
                points[index]
                  ? `Sélectionner ${points[index].monthLabel} - ${formatKg(
                      points[index].monthlyKgCo2eProxy,
                    )}`
                  : "Sélectionner le point de courbe"
              }
              onClick={() => {
                if (points[index]) {
                  setSelectedPointIndex(points[index].index);
                }
              }}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && points[index]) {
                  event.preventDefault();
                  setSelectedPointIndex(points[index].index);
                }
              }}
            />
          ))}

          {axisLabels.map((point, index) => {
            const pointIndex = points.findIndex((candidate) => candidate.index === point.index);
            const matchingLinePoint = linePoints[pointIndex];
            if (!matchingLinePoint) {
              return null;
            }

            return (
              <g key={`${point.date}-${index}`}>
                <line
                  x1={matchingLinePoint.x}
                  x2={matchingLinePoint.x}
                  y1={padding.top + chartHeight}
                  y2={padding.top + chartHeight + 10}
                  stroke="rgba(255,255,255,0.3)"
                />
                <text
                  x={matchingLinePoint.x}
                  y={padding.top + chartHeight + 32}
                  textAnchor={index === 0 ? "start" : index === axisLabels.length - 1 ? "end" : "middle"}
                  className="fill-red-100/35 text-[11px] font-bold"
                >
                  {point.monthLabel}
                </text>
              </g>
            );
          })}

          <text
            x={20}
            y={height - 16}
            className="fill-red-100/30 text-[11px] font-black uppercase tracking-[0.18em]"
          >
            Temps
          </text>
          <text
            x={width - 24}
            y={20}
            textAnchor="end"
            className="fill-red-100/30 text-[11px] font-black uppercase tracking-[0.18em]"
          >
            {infrastructure.graph.yAxisLabel}
          </text>
        </svg>
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/35">
              Point hebdomadaire sélectionné
            </p>
            <h4 className="mt-1 text-lg font-black tracking-tight text-white">
              {selectedPoint?.monthLabel ?? "Aucun point"}
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-red-100/45">
              Cliquez sur une semaine pour afficher la part de pollution de
              chaque poste.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                Semaine
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {selectedPoint?.index ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                Pollution hebdo
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {formatKg(selectedPoint?.monthlyKgCo2eProxy ?? null)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                Cumul
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {formatKg(selectedPoint?.cumulativeKgCo2eProxy ?? null)}
              </p>
            </div>
          </div>
        </div>

        {selectedServiceBreakdown.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {selectedServiceBreakdown.map((service) => (
              <div
                key={`${service.key}-${selectedPoint?.index ?? "none"}`}
                className="rounded-2xl border border-white/10 bg-black/10 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: SERVICE_COLORS[service.key] ?? "#fb7185",
                      }}
                    />
                    <p className="truncate text-sm font-black text-white">
                      {service.label}
                    </p>
                  </div>
                  <p className="text-sm font-black text-white">
                    {formatSharePercent(service.sharePercent)}
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(0, service.sharePercent))}%`,
                      backgroundColor: SERVICE_COLORS[service.key] ?? "#fb7185",
                    }}
                  />
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-red-100/45">
                  {formatKg(service.value)} sur la semaine sélectionnée.
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
            Granularité
          </p>
          <p className="mt-1 text-sm font-black text-white capitalize">
            {infrastructure.graph.granularity}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
            Incertitude proxy
          </p>
          <p className="mt-1 text-sm font-black text-white">
            ± {formatPercent(infrastructure.graph.uncertaintyPercent)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
            Couverture mesurée
          </p>
          <p className="mt-1 text-sm font-black text-white">
            {formatPercent(infrastructure.graph.coveragePercent)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/35">
          Considérations intégrées au calcul
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {infrastructure.graph.considerations.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-xs leading-relaxed text-red-100/55"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {topServices.map((service) => (
          <div
            key={service.key}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: SERVICE_COLORS[service.key] ?? "#fb7185",
                }}
              />
              <p className="text-sm font-black text-white">{service.label}</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-red-100/45">
              {formatKg(service.monthlyKgCo2eProxy)} / mois,{" "}
              {formatKg(service.annualKgCo2eProxy)} / an
            </p>
          </div>
        ))}
      </div>
    </figure>
  );
}
