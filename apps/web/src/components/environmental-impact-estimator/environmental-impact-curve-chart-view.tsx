import type {
  EnvironmentalImpactScopeEstimate,
  EnvironmentalImpactScopeKey,
} from "@/lib/environmental-impact-estimator/types";
import { formatKg } from "./environmental-impact-curve-chart.formatters";
import {
  CURVE_COLORS,
  type ChartPoint,
  type CurveChartGeometry,
} from "./environmental-impact-curve-chart.model";

function EnvironmentalImpactCurveChartPoints({
  scopeKey,
  scope,
  points,
  selectedPointIndex,
  onPointClick,
}: {
  scopeKey: EnvironmentalImpactScopeKey;
  scope: EnvironmentalImpactScopeEstimate;
  points: ChartPoint[];
  selectedPointIndex: number;
  onPointClick: (pointIndex: number) => void;
}) {
  const color = CURVE_COLORS[scopeKey];

  return (
    <>
      {points.map((point, index) => (
        <circle
          key={`${scopeKey}-${scope.curve[index]?.date ?? index}`}
          cx={point.x}
          cy={point.y}
          r={
            scope.curve[index]?.index === selectedPointIndex
              ? 8
              : index === 0 || index === points.length - 1
                ? 6
                : 4
          }
          fill={scope.curve[index]?.index === selectedPointIndex ? color : "#fff"}
          stroke={scope.curve[index]?.index === selectedPointIndex ? "#fff" : color}
          strokeWidth={scope.curve[index]?.index === selectedPointIndex ? "4.5" : "4"}
          style={{ cursor: "pointer" }}
          aria-hidden="true"
          onClick={() => {
            if (scope.curve[index]) {
              onPointClick(scope.curve[index].index);
            }
          }}
        />
      ))}
    </>
  );
}

function EnvironmentalImpactCurveChartControls({
  scopeKey,
  scope,
  selectedPointIndex,
  onPointClick,
}: {
  scopeKey: EnvironmentalImpactScopeKey;
  scope: EnvironmentalImpactScopeEstimate;
  selectedPointIndex: number;
  onPointClick: (pointIndex: number) => void;
}) {
  const label = scopeKey === "site" ? "Points de la courbe du site" : "Points de la courbe utilisateur";
  const selectionLabel = scopeKey === "site" ? "Sélectionner le site" : "Sélectionner l'utilisateur";

  return (
    <fieldset className="mt-3 min-w-0 border-0 p-0" aria-label={label}>
      <legend className="cmm-text-caption font-black uppercase tracking-[0.18em] text-red-100/55">
        {label}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {scope.curve.map((point) => (
          <button
            key={`${scopeKey}-accessible-${point.date}`}
            type="button"
            aria-pressed={point.index === selectedPointIndex}
            aria-label={`${selectionLabel}: ${point.weekLabel} - ${formatKg(point.weeklyKgCo2eProxy)}`}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white transition hover:border-white/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            onClick={() => onPointClick(point.index)}
          >
            {point.weekLabel}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function EnvironmentalImpactCurveChartAxisLabels({
  axisLabels,
  sitePoints,
  userPoints,
  padding,
  chartHeight,
}: {
  axisLabels: CurveChartGeometry["axisLabels"];
  sitePoints: ChartPoint[];
  userPoints: ChartPoint[];
  padding: CurveChartGeometry["padding"];
  chartHeight: number;
}) {
  return (
    <>
      {axisLabels.map((point, index) => {
        const matchingLinePoint = point ? sitePoints[point.index] ?? userPoints[point.index] : null;

        if (!point || !matchingLinePoint) {
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
    </>
  );
}

function EnvironmentalImpactCurveChartGrid({
  padding,
  width,
  chartHeight,
  maxValue,
}: {
  padding: CurveChartGeometry["padding"];
  width: number;
  chartHeight: number;
  maxValue: number;
}) {
  return (
    <>
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
    </>
  );
}

function EnvironmentalImpactCurveChartPaths({
  geometry,
  selectedLinePoint,
}: {
  geometry: CurveChartGeometry;
  selectedLinePoint: ChartPoint | null;
}) {
  const {
    padding,
    chartHeight,
    sitePoints,
    userPoints,
    siteUncertaintyPath,
    siteAreaPath,
    siteLinePath,
    userUncertaintyPath,
    userAreaPath,
    userLinePath,
  } = geometry;

  return (
    <>
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
    </>
  );
}

export function EnvironmentalImpactCurveChartView({
  site,
  user,
  geometry,
  selectedPointIndex,
  selectedLinePoint,
  onSitePointClick,
  onUserPointClick,
}: {
  site: EnvironmentalImpactScopeEstimate;
  user: EnvironmentalImpactScopeEstimate;
  geometry: CurveChartGeometry;
  selectedPointIndex: number;
  selectedLinePoint: ChartPoint | null;
  onSitePointClick: (pointIndex: number) => void;
  onUserPointClick: (pointIndex: number) => void;
}) {
  const {
    width,
    height,
    padding,
    chartHeight,
    maxValue,
    sitePoints,
    userPoints,
    axisLabels,
  } = geometry;

  return (
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

        <EnvironmentalImpactCurveChartGrid
          padding={padding}
          width={width}
          chartHeight={chartHeight}
          maxValue={maxValue}
        />
        <EnvironmentalImpactCurveChartPaths
          geometry={geometry}
          selectedLinePoint={selectedLinePoint}
        />

        <EnvironmentalImpactCurveChartPoints
          scopeKey="site"
          scope={site}
          points={sitePoints}
          selectedPointIndex={selectedPointIndex}
          onPointClick={onSitePointClick}
        />
        <EnvironmentalImpactCurveChartPoints
          scopeKey="user"
          scope={user}
          points={userPoints}
          selectedPointIndex={selectedPointIndex}
          onPointClick={onUserPointClick}
        />
        <EnvironmentalImpactCurveChartAxisLabels
          axisLabels={axisLabels}
          sitePoints={sitePoints}
          userPoints={userPoints}
          padding={padding}
          chartHeight={chartHeight}
        />

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
      <div className="space-y-3 px-4 pb-4" aria-label="Sélection clavier des points de courbe">
        <EnvironmentalImpactCurveChartControls
          scopeKey="site"
          scope={site}
          selectedPointIndex={selectedPointIndex}
          onPointClick={onSitePointClick}
        />
        <EnvironmentalImpactCurveChartControls
          scopeKey="user"
          scope={user}
          selectedPointIndex={selectedPointIndex}
          onPointClick={onUserPointClick}
        />
      </div>
    </div>
  );
}
