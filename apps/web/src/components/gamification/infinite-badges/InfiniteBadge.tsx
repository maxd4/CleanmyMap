"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeSurface } from "@/components/gamification/badge-surface";
import {
  GamificationStatePill,
  getGamificationBadgeState,
} from "@/components/gamification/badge-ui";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  computeLevel,
  computeBadgeRank,
  computePlacesRank,
  computeActionCreationRank,
  BADGE_TIER_STYLES,
  formatCompactNumber,
  nextThreshold,
  type BadgeFamily,
} from "./utils";
import { BadgeModal } from "./BadgeModal";

type InfiniteBadgeProps = {
  icon: string;
  title: string;
  description: string;
  total: number;
  step: number;
  unitLabel?: string;
  family?: BadgeFamily;
  onMilestoneReached?: (payload: {
    level: number;
    title: string;
    icon: string;
    rank: string;
    family?: BadgeFamily;
  }) => void;
};

export function InfiniteBadge({
  icon,
  title,
  description,
  total,
  step,
  unitLabel,
  family,
  onMilestoneReached,
}: InfiniteBadgeProps) {
  const { locale } = useSitePreferences();
  const [open, setOpen] = useState(false);
  const previousLevelRef = useRef<number | null>(null);

  const level = useMemo(() => computeLevel(total, step), [step, total]);
  const rank = useMemo(
    () =>
      family === "lieux"
        ? computePlacesRank(level)
        : family === "actions"
          ? computeActionCreationRank(level)
          : computeBadgeRank(level),
    [family, level],
  );
  const tier = rank.tier;
  const styles = BADGE_TIER_STYLES[tier];
  const state = getGamificationBadgeState(total, level * step);

  const isPlaces = family === "lieux";
  const isActions = family === "actions";
  const placesRank = isPlaces ? (rank as ReturnType<typeof computePlacesRank>) : null;
  const actionsRank = isActions ? (rank as ReturnType<typeof computeActionCreationRank>) : null;
  const displayTitle =
    isPlaces && placesRank
      ? placesRank.title
      : isActions && actionsRank
        ? actionsRank.title
        : title;
  const displayIcon =
    isPlaces && placesRank
      ? placesRank.icon
      : isActions && actionsRank
        ? actionsRank.icon
        : icon;
  const displayRank = `${rank.grade}${rank.subGrade ? ` ${rank.subGrade}` : ""}`.trim();

  const next = useMemo(() => nextThreshold(level, step), [level, step]);
  const progress = useMemo(() => {
    const base = level * step;
    if (next <= base) return 0;
    const ratio = (Math.max(0, total) - base) / (next - base);
    return Math.max(0, Math.min(1, ratio));
  }, [level, next, step, total]);

  useEffect(() => {
    const previousLevel = previousLevelRef.current;
    previousLevelRef.current = level;

    if (previousLevel === null) {
      return;
    }

    if (level > previousLevel) {
      onMilestoneReached?.({
        level,
        title: displayTitle,
        icon: displayIcon,
        rank: displayRank,
        family,
      });
    }

    return undefined;
  }, [displayIcon, displayRank, displayTitle, family, level, onMilestoneReached]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="group relative w-full text-left">
        <motion.div
          key={`${family ?? "default"}-${level}`}
          initial={{ opacity: 0.96, scale: 0.985, y: 2 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={`relative overflow-hidden rounded-3xl border p-5 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl ${styles.container}`}
        >
          <div
            className={`absolute inset-0 rounded-3xl ${styles.glow} blur-xl transition-opacity opacity-0 group-hover:opacity-100`}
          />
          <div
            className={`absolute -right-8 -top-8 h-32 w-32 rounded-full border-[6px] ${styles.ornament} pointer-events-none transition-transform duration-700 group-hover:rotate-45`}
          />
          <div
            className={`absolute -bottom-10 -right-4 h-24 w-24 rounded-full border-[4px] ${styles.ornament} pointer-events-none transition-transform duration-700 group-hover:-rotate-12`}
          />

          <div className="relative z-10 flex items-start justify-between gap-4">
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
                {displayRank}
              </p>
              <p className={`mt-1 text-3xl font-black tracking-tight ${styles.text} drop-shadow-md`}>
                Niv {level}
              </p>
              <div className="mt-2 flex justify-end">
                <GamificationStatePill state={state} />
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-5">
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
                key={`${family ?? "default"}-${level}-progress`}
                className={`h-full rounded-full transition-all duration-1000 ease-out ${styles.progress} cmm-gamification-progress`}
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        </motion.div>
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
