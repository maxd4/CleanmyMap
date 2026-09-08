"use client";

import { Cloud, Droplets, Euro, Info, Leaf, Trash2, UsersRound } from "lucide-react";
import { useRef, useState } from "react";
import type {
  HomeImpactSnapshot,
  HomeMetric,
} from "@/lib/accueil/config";
import { buildImpactInsight } from "./accueil-impact-copy";
import { ParticipantsDistribution } from "./accueil-participants-distribution";

type HomeImpactKpiCardProps = {
  metric: HomeMetric;
  impactSnapshot: HomeImpactSnapshot | null;
};

const metricStyles = {
  blue: {
    icon: "bg-[#c9f8e5] text-[#007452]",
    label: "text-[#14254b]",
    value: "text-[#07553f]",
  },
  emerald: {
    icon: "bg-[#c9f8e5] text-[#007452]",
    label: "text-[#14254b]",
    value: "text-[#07553f]",
  },
  amber: {
    icon: "bg-[#c9f8e5] text-[#007452]",
    label: "text-[#14254b]",
    value: "text-[#07553f]",
  },
} as const;

const metricIcons = {
  wasteKg: Trash2,
  butts: Leaf,
  volunteers: UsersRound,
  co2: Cloud,
  water: Droplets,
  euro: Euro,
} as const;

export function shouldToggleTooltipOnClick(
  pointerType: string | null,
  clickDetail: number,
) {
  return (pointerType === "touch" || pointerType === "pen") && clickDetail > 0;
}

export function shouldOpenTooltipOnFocus(pointerType: string | null) {
  return pointerType === null;
}

export function HomeImpactKpiCard({
  metric,
  impactSnapshot,
}: HomeImpactKpiCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const lastPointerTypeRef = useRef<string | null>(null);
  const style = metricStyles[metric.accent];
  const tooltipId = `impact-tooltip-${metric.key}`;
  const insight = buildImpactInsight(metric.key, impactSnapshot);
  const MetricIcon = metricIcons[metric.key as keyof typeof metricIcons];

  return (
    <article className="group relative min-h-[9rem] rounded-[1.15rem] border border-white/65 bg-[rgba(222,249,239,0.62)] p-3 shadow-[0_18px_32px_-24px_rgba(0,68,45,0.35)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:bg-[rgba(236,253,245,0.74)] min-[1200px]:min-h-[11.25rem] min-[1200px]:rounded-[1.35rem] min-[1200px]:p-5">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.35rem] bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.72),transparent_40%)]" />
      <div className="relative z-10 flex h-full flex-col gap-4 min-[1200px]:gap-6">
        <div className="flex items-start gap-2 min-[1200px]:gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full min-[1200px]:h-12 min-[1200px]:w-12 ${style.icon}`} aria-hidden="true">
            {MetricIcon ? <MetricIcon size={22} strokeWidth={2.2} /> : null}
          </span>
          <p className={`min-w-0 flex-1 pt-1 text-sm font-black leading-tight tracking-[-0.015em] sm:text-base min-[1200px]:text-lg ${style.label}`}>
            {metric.label}
          </p>
          <button
            type="button"
            aria-label={`Afficher la méthode de calcul pour ${metric.label}`}
            aria-controls={tooltipId}
            aria-describedby={isOpen ? tooltipId : undefined}
            aria-expanded={isOpen}
            onPointerDown={(event) => {
              lastPointerTypeRef.current = event.pointerType || null;
              if (event.pointerType === "mouse") {
                setIsOpen(false);
              }
            }}
            onClick={(event) => {
              const pointerType = lastPointerTypeRef.current;
              lastPointerTypeRef.current = null;
              if (shouldToggleTooltipOnClick(pointerType, event.detail)) {
                setIsOpen((current) => !current);
              }
            }}
            onFocus={() => {
              if (shouldOpenTooltipOnFocus(lastPointerTypeRef.current)) {
                setIsOpen(true);
              }
            }}
            onBlur={() => setIsOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsOpen(false);
              }
            }}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#8eb7aa]/70 bg-white/55 text-[#145342] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047957] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <Info size={14} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <div className="min-w-0">
          <p className={`truncate font-black leading-none tracking-[-0.04em] ${metric.key === "water" ? "text-[clamp(1.2rem,4vw,1.65rem)] min-[1200px]:text-[clamp(1.9rem,1.65vw,2.35rem)]" : "text-[clamp(1.55rem,4.8vw,2rem)] min-[1200px]:text-[clamp(2.25rem,2.5vw,3rem)]"} ${style.value}`}>
            {metric.value === "n/a" ? "—" : metric.value}
          </p>
        </div>
      </div>

      <div
        id={tooltipId}
        role="tooltip"
        aria-hidden={!isOpen}
        style={{ zIndex: 1200 }}
        className={`invisible pointer-events-none absolute bottom-[calc(100%+0.75rem)] right-0 z-30 w-[min(19rem,calc(100vw-2.5rem))] translate-y-2 rounded-2xl border border-white/80 bg-[#f7fffb] p-4 text-left text-[#14334a] opacity-0 shadow-[0_22px_42px_-20px_rgba(0,49,36,0.55)] transition duration-200 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 ${isOpen ? "!pointer-events-auto !visible !translate-y-0 !opacity-100" : ""}`}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0b7758]">
          {metric.label}
        </p>
        <div className="mt-3 space-y-2 text-xs font-semibold leading-5">
          {insight.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {metric.key === "volunteers" ? (
            <ParticipantsDistribution
              distribution={impactSnapshot?.actionDistribution ?? []}
            />
          ) : null}
        </div>
        {insight.note ? (
          <p className="mt-3 border-t border-[#b8ded0] pt-3 text-[10px] font-medium leading-4 text-[#41675e]">
            {insight.note}
          </p>
        ) : null}
      </div>
    </article>
  );
}
