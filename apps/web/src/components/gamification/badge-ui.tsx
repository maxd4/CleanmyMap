import type { CSSProperties, ReactNode } from "react";

export type GamificationBadgeState = "vide" | "actif" | "debloque";

export type GamificationBadgeMetric = {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
};

export function getGamificationBadgeState(current: number, threshold: number): GamificationBadgeState {
  if (!Number.isFinite(current) || current <= 0) {
    return "vide";
  }

  if (!Number.isFinite(threshold) || threshold <= 0) {
    return "actif";
  }

  return current === threshold ? "debloque" : "actif";
}

const BADGE_STATE_STYLES: Record<GamificationBadgeState, string> = {
  vide: "border-white/10 bg-white/5 text-white/55",
  actif: "border-cyan-200/15 bg-cyan-500/10 text-cyan-50/90",
  debloque: "border-emerald-200/15 bg-emerald-500/10 text-emerald-50/90",
};

export function GamificationStatePill({ state }: { state: GamificationBadgeState }) {
  const label = state === "vide" ? "Vide" : state === "debloque" ? "Débloqué" : "Actif";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${BADGE_STATE_STYLES[state]}`}
    >
      {label}
    </span>
  );
}

export function GamificationMetricChip({
  label,
  value,
  caption,
  className,
}: GamificationBadgeMetric & { className?: string }) {
  return (
    <div
      className={`rounded-2xl border px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.18em] ${className ?? "border-white/10 bg-white/5 text-white/90"}`}
    >
      <div className="text-[9px] text-white/45">{label}</div>
      <div className="mt-1 text-base font-black text-white">{value}</div>
      {caption ? <div className="mt-1 text-[9px] normal-case tracking-normal text-white/45">{caption}</div> : null}
    </div>
  );
}

export function GamificationTooltipButton({
  id,
  label,
  content,
  className,
  tooltipClassName,
}: {
  id: string;
  label: string;
  content: ReactNode;
  className?: string;
  tooltipClassName?: string;
}) {
  return (
    <button
      type="button"
      className={`group relative inline-flex items-center gap-2 rounded-full border border-cyan-200/10 bg-cyan-500/8 px-3 py-1.5 text-[11px] font-semibold leading-relaxed text-cyan-50/80 transition hover:bg-cyan-500/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/40 ${className ?? ""}`}
      aria-describedby={id}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-200/70" />
      {label}
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute left-0 top-full z-20 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-cyan-100/10 bg-slate-950/95 px-3 py-2 text-left text-[11px] leading-relaxed text-cyan-50 opacity-0 shadow-2xl transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 ${tooltipClassName ?? ""}`}
      >
        {content}
      </span>
    </button>
  );
}

export function GamificationBadgePanel({
  shellClassName,
  glowClassName,
  progressClassName,
  shellStyle,
  glowStyle,
  celebrating = false,
  eyebrow,
  description,
  summaryLabel,
  summaryValue,
  summaryUnit,
  state,
  metrics,
  progressLabel,
  progressValue,
  progressPercent,
  progressFooterLeft,
  progressFooterRight,
  tooltip,
}: {
  shellClassName: string;
  glowClassName: string;
  progressClassName: string;
  shellStyle?: CSSProperties;
  glowStyle?: CSSProperties;
  celebrating?: boolean;
  eyebrow: ReactNode;
  description: ReactNode;
  summaryLabel: string;
  summaryValue: ReactNode;
  summaryUnit: string;
  state: GamificationBadgeState;
  metrics: GamificationBadgeMetric[];
  progressLabel: string;
  progressValue: ReactNode;
  progressPercent: number;
  progressFooterLeft: ReactNode;
  progressFooterRight: ReactNode;
  tooltip?: {
    id: string;
    label: string;
    content: ReactNode;
  };
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-2xl transition-all duration-300 ${shellClassName} ${celebrating ? "cmm-gamification-celebrate" : ""}`}
      style={shellStyle}
    >
      <div
        className={`absolute inset-0 rounded-[2rem] ${glowClassName} blur-3xl opacity-80`}
        style={glowStyle}
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow}
            <p className="mt-3 max-w-2xl text-sm font-semibold text-slate-100/80">{description}</p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
              {summaryLabel}
            </p>
            <p className="mt-1 text-3xl font-black tracking-tight text-white">{summaryValue}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
              {summaryUnit}
            </p>
            <div className="mt-2 flex justify-end">
              <GamificationStatePill state={state} />
            </div>
          </div>
        </div>

        {metrics.length > 0 ? (
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {metrics.map((metric) => (
              <GamificationMetricChip
                key={metric.label}
                label={metric.label}
                value={metric.value}
                caption={metric.caption}
              />
            ))}
          </div>
        ) : null}

        <div className="mt-5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
            <span>{progressLabel}</span>
            <span>{progressValue}</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-black/30 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${progressClassName}`}
              style={{ width: `${Math.max(0, Math.min(100, Math.round(progressPercent)))}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-white/70">
            <span>{progressFooterLeft}</span>
            <span>{progressFooterRight}</span>
          </div>
        </div>

        {tooltip ? (
          <div className="mt-4">
            <GamificationTooltipButton
              id={tooltip.id}
              label={tooltip.label}
              content={tooltip.content}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
