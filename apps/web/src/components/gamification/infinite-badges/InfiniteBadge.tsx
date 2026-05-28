"use client";

import { useMemo, useState } from "react";
import { BadgeSurface } from "@/components/gamification/badge-surface";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { computeLevel, computeBadgeRank, computePlacesRank, BADGE_TIER_STYLES, formatCompactNumber, nextThreshold, type BadgeFamily } from "./utils";
import { BadgeModal } from "./BadgeModal";

type InfiniteBadgeProps = {
  icon: string;
  title: string;
  description: string;
  total: number;
  step: number;
  unitLabel?: string;
  family?: BadgeFamily;
};

export function InfiniteBadge({
  icon,
  title,
  description,
  total,
  step,
  unitLabel,
  family,
}: InfiniteBadgeProps) {
  const { locale } = useSitePreferences();
  const [open, setOpen] = useState(false);

  const level = useMemo(() => computeLevel(total, step), [step, total]);
  const rank = useMemo(() =>
    family === "lieux" ? computePlacesRank(level) : computeBadgeRank(level),
    [family, level]
  );
  const tier = rank.tier;
  const styles = BADGE_TIER_STYLES[tier];

  // Pour le badge lieux : titre et icône évoluent avec le rang
  const isPlaces = family === "lieux";
  const placesRank = isPlaces ? (rank as ReturnType<typeof computePlacesRank>) : null;
  const displayTitle = isPlaces && placesRank ? placesRank.title : title;
  const displayIcon = isPlaces && placesRank ? placesRank.icon : icon;

  const next = useMemo(() => nextThreshold(level, step), [level, step]);
  const progress = useMemo(() => {
    const base = level * step;
    if (next <= base) return 0;
    const ratio = (Math.max(0, total) - base) / (next - base);
    return Math.max(0, Math.min(1, ratio));
  }, [level, next, step, total]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group w-full text-left relative"
      >
        {/* Glow de fond */}
        <div className={`absolute inset-0 rounded-3xl ${styles.glow} blur-xl transition-opacity opacity-0 group-hover:opacity-100`} />

        <div className={`relative overflow-hidden rounded-3xl border p-5 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl ${styles.container}`}>
          
          {/* Ornements décoratifs */}
          <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full border-[6px] ${styles.ornament} pointer-events-none transition-transform duration-700 group-hover:rotate-45`} />
          <div className={`absolute -bottom-10 -right-4 h-24 w-24 rounded-full border-[4px] ${styles.ornament} pointer-events-none transition-transform duration-700 group-hover:-rotate-12`} />

          <div className="relative flex items-start justify-between gap-4 z-10">
            <div className="min-w-0">
              <BadgeSurface
                icon={displayIcon}
                label={displayTitle}
                tone="gamification"
                variant="pill"
                className="inline-flex shadow-md"
              />
              <p className={`mt-3 text-xs font-bold ${styles.text} opacity-90`}>
                {description}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${styles.text} opacity-60`}>
                {rank.grade} {rank.subGrade}
              </p>
              <p className={`mt-1 text-3xl font-black tracking-tight ${styles.text} drop-shadow-md`}>
                Niv {level}
              </p>
            </div>
          </div>

          <div className="relative mt-5 z-10">
            <div className={`flex items-center justify-between text-[11px] font-bold ${styles.text} opacity-70`}>
              <span>
                {formatCompactNumber(total, locale)}
                {unitLabel ? ` ${unitLabel}` : ""}
              </span>
              <span>
                {formatCompactNumber(next, locale)}
                {unitLabel ? ` ${unitLabel}` : ""}
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-black/40 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${styles.progress}`}
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </button>

      <BadgeModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={displayTitle}
        description={description}
        total={total}
        step={step}
        unitLabel={unitLabel}
        family={family}
      />
    </>
  );
}

