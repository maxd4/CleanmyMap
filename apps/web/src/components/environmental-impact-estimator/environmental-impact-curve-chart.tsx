"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type {
  EnvironmentalImpactInfrastructureEstimate,
  EnvironmentalImpactProjectSignals,
  EnvironmentalImpactScopeEstimate,
  EnvironmentalImpactScopeKey,
} from "@/lib/environmental-impact-estimator/types";

type EnvironmentalImpactCurveChartProps = {
  site: EnvironmentalImpactScopeEstimate;
  user: EnvironmentalImpactScopeEstimate;
  infrastructure: EnvironmentalImpactInfrastructureEstimate;
  signals?: EnvironmentalImpactProjectSignals | null;
  className?: string;
};

const CURVE_COLORS: Record<EnvironmentalImpactScopeKey, string> = {
  site: "#f59e0b",
  user: "#60a5fa",
};

type DriverRow = {
  key: "page_view" | "community" | "notifications" | "actions" | "PDF" | "IA" | "Codex";
  label: string;
  kg: number;
  sharePercent: number;
};

function formatKg(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(value)} kg CO2e proxy`;
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

function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function buildChartPoints(
  points: EnvironmentalImpactScopeEstimate["curve"],
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number },
  maxValue: number,
) {
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  return points.map((point, index) => ({
    x: padding.left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * chartWidth),
    y: padding.top + chartHeight - (point.cumulativeKgCo2eProxy / maxValue) * chartHeight,
    lowerY: padding.top + chartHeight - (point.lowerKgCo2eProxy / maxValue) * chartHeight,
    upperY: padding.top + chartHeight - (point.upperKgCo2eProxy / maxValue) * chartHeight,
  }));
}

function buildDriverBreakdown(
  params: {
    pointTotal: number;
    scope: EnvironmentalImpactScopeEstimate;
    signals?: EnvironmentalImpactProjectSignals | null;
  },
): DriverRow[] {
  const { pointTotal, scope, signals } = params;
  const traffic = signals?.signalBreakdown?.traffic;
  const community = signals?.signalBreakdown?.community;
  const communication = signals?.signalBreakdown?.communication;
  const scopeInput = scope.key === "site" ? signals?.siteInput : signals?.userInput;
  const codexKg = scope.key === "user" ? signals?.codexUsage?.estimatedKgCo2eProxy ?? 0 : 0;
  const rawRows: Array<DriverRow & { weight: number }> = [
    {
      key: "page_view",
      label: "page_view",
      kg: 0,
      sharePercent: 0,
      weight:
        ((traffic?.pageViewEvents ?? 0) + (traffic?.legacyPageViewEvents ?? 0)) * 0.000015 +
        (scopeInput?.pageViews ?? 0) * 0.00001,
    },
    {
      key: "community",
      label: "community",
      kg: 0,
      sharePercent: 0,
      weight:
        ((community?.events ?? 0) + (community?.rsvps ?? 0)) * 0.00002 +
        (scopeInput?.storageGbMonths ?? 0) * 0.000006,
    },
    {
      key: "notifications",
      label: "notifications",
      kg: 0,
      sharePercent: 0,
      weight:
        ((community?.notifications ?? 0) + (community?.unreadNotifications ?? 0)) * 0.000012 +
        (scopeInput?.apiRequests ?? 0) * 0.000003,
    },
    {
      key: "actions",
      label: "actions",
      kg: 0,
      sharePercent: 0,
      weight: (scopeInput?.maps ?? 0) * 0.00002,
    },
    {
      key: "PDF",
      label: "PDF",
      kg: 0,
      sharePercent: 0,
      weight: ((communication?.pdfExports ?? 0) + (scopeInput?.pdfExports ?? 0)) * 0.00003,
    },
    {
      key: "IA",
      label: "IA",
      kg: 0,
      sharePercent: 0,
      weight: (scopeInput?.aiCalls ?? 0) * 0.00005,
    },
    {
      key: "Codex",
      label: "Codex",
      kg: 0,
      sharePercent: 0,
      weight: codexKg > 0 ? codexKg : 0,
    },
  ];

  const totalWeight = rawRows.reduce((acc, row) => acc + row.weight, 0);

  if (pointTotal <= 0 || totalWeight <= 0) {
    return rawRows.map((row) => ({
      key: row.key,
      label: row.label,
      kg: 0,
      sharePercent: 0,
    }));
  }

  return rawRows.map((row) => {
    const sharePercent = (row.weight / totalWeight) * 100;
    return {
      key: row.key,
      label: row.label,
      kg: pointTotal * (row.weight / totalWeight),
      sharePercent,
    };
  });
}

export function EnvironmentalImpactCurveChart({
  site,
  user,
  infrastructure,
  signals,
  className,
}: EnvironmentalImpactCurveChartProps) {
  const [selectedScopeKey, setSelectedScopeKey] = useState<EnvironmentalImpactScopeKey>("site");
  const [selectedPointIndex, setSelectedPointIndex] = useState<number>(
    Math.max(site.curve.at(-1)?.index ?? 0, user.curve.at(-1)?.index ?? 0),
  );

  useEffect(() => {
    setSelectedPointIndex(Math.max(site.curve.at(-1)?.index ?? 0, user.curve.at(-1)?.index ?? 0));
    setSelectedScopeKey("site");
  }, [site.curve, user.curve]);

  const width = 1000;
  const height = 380;
  const padding = { top: 28, right: 28, bottom: 64, left: 72 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(
    1,
    ...site.curve.map((point) => point.cumulativeKgCo2eProxy),
    ...user.curve.map((point) => point.cumulativeKgCo2eProxy),
  );
  const sitePoints = buildChartPoints(site.curve, width, height, padding, maxValue);
  const userPoints = buildChartPoints(user.curve, width, height, padding, maxValue);
  const maxPointCount = Math.max(sitePoints.length, userPoints.length);
  const selectedSitePoint =
    site.curve.find((point) => point.index === selectedPointIndex) ?? site.curve.at(-1) ?? null;
  const selectedUserPoint =
    user.curve.find((point) => point.index === selectedPointIndex) ?? user.curve.at(-1) ?? null;
  const selectedScope: EnvironmentalImpactScopeEstimate =
    selectedScopeKey === "user" ? user : site;
  const selectedScopePoint =
    selectedScope.key === "user" ? selectedUserPoint : selectedSitePoint;
  const selectedScopeBreakdown = buildDriverBreakdown({
    pointTotal: selectedScopePoint?.weeklyKgCo2eProxy ?? 0,
    scope: selectedScope,
    signals,
  });
  const selectedLinePoint =
    selectedScopeKey === "user"
      ? userPoints.find((point, index) => index === selectedPointIndex) ?? null
      : sitePoints.find((point, index) => index === selectedPointIndex) ?? null;
  const midIndex = Math.floor((maxPointCount - 1) / 2);
  const axisLabels =
    maxPointCount > 2
      ? [
          site.curve[0] ?? user.curve[0],
          site.curve[midIndex] ?? user.curve[midIndex],
          site.curve.at(-1) ?? user.curve.at(-1),
        ].filter(Boolean)
      : site.curve.length > 0
        ? site.curve
        : user.curve;
  const siteLinePath = buildLinePath(sitePoints);
  const userLinePath = buildLinePath(userPoints);
  const siteAreaPath = `${buildLinePath([
    { x: padding.left, y: padding.top + chartHeight },
    ...sitePoints,
    { x: padding.left + chartWidth, y: padding.top + chartHeight },
  ])} Z`;
  const userAreaPath = `${buildLinePath([
    { x: padding.left, y: padding.top + chartHeight },
    ...userPoints,
    { x: padding.left + chartWidth, y: padding.top + chartHeight },
  ])} Z`;
  const siteUncertaintyPath = `${buildLinePath([
    ...sitePoints.map((point) => ({ x: point.x, y: point.upperY })),
    ...[...sitePoints]
      .reverse()
      .map((point) => ({ x: point.x, y: point.lowerY })),
  ])} Z`;
  const userUncertaintyPath = `${buildLinePath([
    ...userPoints.map((point) => ({ x: point.x, y: point.upperY })),
    ...[...userPoints]
      .reverse()
      .map((point) => ({ x: point.x, y: point.lowerY })),
  ])} Z`;
  const selectedXAxisPoint = site.curve.find((point) => point.index === selectedPointIndex) ?? user.curve.find((point) => point.index === selectedPointIndex) ?? null;

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
            Pollution du site et pollution attribuée à l&apos;utilisateur
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-red-100/45">
            Le tracé expose deux courbes hebdomadaires cumulées depuis la mise en ligne:
            le total du site et le total attribué à l&apos;utilisateur. Clique sur un point
            pour comparer les deux séries et ouvrir le détail des familles de signaux.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/35">
              Site total
            </p>
            <p className="mt-1 text-lg font-black text-white">
              {formatKg(site.totalKgCo2eProxy)}
            </p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
              Confiance {formatPercent(infrastructure.graph.confidencePercent)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/35">
              Utilisateur
            </p>
            <p className="mt-1 text-lg font-black text-white">
              {formatKg(user.totalKgCo2eProxy)}
            </p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
              Confiance {formatPercent(infrastructure.graph.confidencePercent)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-100/45">
        <span className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CURVE_COLORS.site }}
          />
          Site total
        </span>
        <span className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CURVE_COLORS.user }}
          />
          Utilisateur
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
          1 point hebdo
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#19090a]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[260px] w-full md:h-[320px]"
          role="img"
          aria-label="Courbes temporelles de l'impact environnemental proxy"
        >
          <defs>
            <linearGradient id="environmental-impact-site-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="environmental-impact-user-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.03" />
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

          {sitePoints.length > 0 ? (
            <>
              <path d={siteUncertaintyPath} fill="rgba(245, 158, 11, 0.07)" />
              <path d={siteAreaPath} fill="url(#environmental-impact-site-fill)" />
              <path
                d={siteLinePath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : null}

          {userPoints.length > 0 ? (
            <>
              <path d={userUncertaintyPath} fill="rgba(96, 165, 250, 0.06)" />
              <path d={userAreaPath} fill="url(#environmental-impact-user-fill)" />
              <path
                d={userLinePath}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="10 6"
              />
            </>
          ) : null}

          {selectedLinePoint ? (
            <line
              x1={selectedLinePoint.x}
              x2={selectedLinePoint.x}
              y1={padding.top}
              y2={padding.top + chartHeight}
              stroke="rgba(255,255,255,0.24)"
              strokeDasharray="6 8"
            />
          ) : null}

          {sitePoints.map((point, index) => (
            <circle
              key={`site-${site.curve[index]?.date ?? index}`}
              cx={point.x}
              cy={point.y}
              r={
                site.curve[index]?.index === selectedPointIndex
                  ? 8
                  : index === 0 || index === sitePoints.length - 1
                    ? 6
                    : 4
              }
              fill={site.curve[index]?.index === selectedPointIndex ? CURVE_COLORS.site : "#fff"}
              stroke={site.curve[index]?.index === selectedPointIndex ? "#fff" : CURVE_COLORS.site}
              strokeWidth={site.curve[index]?.index === selectedPointIndex ? "4.5" : "4"}
              style={{ cursor: "pointer" }}
              role="button"
              tabIndex={0}
              aria-label={
                site.curve[index]
                  ? `Sélectionner le site: ${site.curve[index].weekLabel} - ${formatKg(
                      site.curve[index].weeklyKgCo2eProxy,
                    )}`
                  : "Sélectionner le point de courbe site"
              }
              onClick={() => {
                if (site.curve[index]) {
                  setSelectedScopeKey("site");
                  setSelectedPointIndex(site.curve[index].index);
                }
              }}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && site.curve[index]) {
                  event.preventDefault();
                  setSelectedPointIndex(site.curve[index].index);
                }
              }}
            />
          ))}

          {userPoints.map((point, index) => (
            <circle
              key={`user-${user.curve[index]?.date ?? index}`}
              cx={point.x}
              cy={point.y}
              r={
                user.curve[index]?.index === selectedPointIndex
                  ? 8
                  : index === 0 || index === userPoints.length - 1
                    ? 6
                    : 4
              }
              fill={user.curve[index]?.index === selectedPointIndex ? CURVE_COLORS.user : "#fff"}
              stroke={user.curve[index]?.index === selectedPointIndex ? "#fff" : CURVE_COLORS.user}
              strokeWidth={user.curve[index]?.index === selectedPointIndex ? "4.5" : "4"}
              style={{ cursor: "pointer" }}
              role="button"
              tabIndex={0}
              aria-label={
                user.curve[index]
                  ? `Sélectionner l'utilisateur: ${user.curve[index].weekLabel} - ${formatKg(
                      user.curve[index].weeklyKgCo2eProxy,
                    )}`
                  : "Sélectionner le point de courbe utilisateur"
              }
              onClick={() => {
                if (user.curve[index]) {
                  setSelectedScopeKey("user");
                  setSelectedPointIndex(user.curve[index].index);
                }
              }}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && user.curve[index]) {
                  event.preventDefault();
                  setSelectedPointIndex(user.curve[index].index);
                }
              }}
            />
          ))}

          {axisLabels.map((point, index) => {
            if (!point) {
              return null;
            }

            const pointIndex = point.index;
            const matchingLinePoint = sitePoints[pointIndex] ?? userPoints[pointIndex];

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
                  {point.weekLabel}
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
            kg CO2e proxy cumulés
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
              {selectedScopePoint?.weekLabel ?? selectedXAxisPoint?.weekLabel ?? "Aucun point"}
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-red-100/45">
              Cliquez sur une semaine pour comparer la courbe du site et celle de l'utilisateur.
              Le bloc suivant détaille la portée actuellement sélectionnée.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                Site
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {formatKg(selectedSitePoint?.weeklyKgCo2eProxy ?? null)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                Utilisateur
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {formatKg(selectedUserPoint?.weeklyKgCo2eProxy ?? null)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                Portée détaillée
              </p>
              <p className="mt-1 text-sm font-black text-white capitalize">
                {selectedScope.key}
              </p>
            </div>
          </div>
        </div>

        {selectedScopeBreakdown.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {selectedScopeBreakdown.map((driver) => (
              <div
                key={`${driver.key}-${selectedPointIndex}`}
                className="rounded-2xl border border-white/10 bg-black/10 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white" />
                    <p className="truncate text-sm font-black text-white">{driver.label}</p>
                  </div>
                  <p className="text-sm font-black text-white">{formatSharePercent(driver.sharePercent)}</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(0, driver.sharePercent))}%`,
                      backgroundColor:
                        driver.key === "page_view"
                          ? "#f59e0b"
                          : driver.key === "community"
                            ? "#ef4444"
                            : driver.key === "notifications"
                              ? "#38bdf8"
                              : driver.key === "actions"
                                ? "#22c55e"
                                : driver.key === "PDF"
                                  ? "#a855f7"
                                  : driver.key === "IA"
                                    ? "#f97316"
                                    : "#60a5fa",
                    }}
                  />
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-red-100/45">
                  {formatKg(driver.kg)} sur la semaine sélectionnée.
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
    </figure>
  );
}
