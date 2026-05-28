"use client";

import { useMemo, useState } from "react";
import { BadgeSurface } from "@/components/gamification/badge-surface";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { computeLevel, formatCompactNumber, nextThreshold } from "./utils";
import { BadgeModal } from "./BadgeModal";

type InfiniteBadgeProps = {
  icon: string;
  title: string;
  description: string;
  total: number;
  step: number;
  unitLabel?: string;
};

export function InfiniteBadge({
  icon,
  title,
  description,
  total,
  step,
  unitLabel,
}: InfiniteBadgeProps) {
  const { locale } = useSitePreferences();
  const [open, setOpen] = useState(false);

  const level = useMemo(() => computeLevel(total, step), [step, total]);
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
        className="group w-full text-left"
      >
        <div className="rounded-3xl border border-white/10 bg-black/30 p-5 backdrop-blur-sm transition-all hover:bg-black/40">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <BadgeSurface
                icon={icon}
                label={title}
                tone="gamification"
                variant="pill"
                className="inline-flex"
              />
              <p className="mt-3 text-xs font-bold text-slate-300">
                {description}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Niveau
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight text-white">
                {level}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span>
                {formatCompactNumber(total, locale)}
                {unitLabel ? ` ${unitLabel}` : ""}
              </span>
              <span>
                {formatCompactNumber(next, locale)}
                {unitLabel ? ` ${unitLabel}` : ""}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400/90 transition-[width]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </button>

      <BadgeModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        total={total}
        step={step}
        unitLabel={unitLabel}
      />
    </>
  );
}

