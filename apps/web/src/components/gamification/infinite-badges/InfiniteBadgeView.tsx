"use client";

import { motion } from "framer-motion";
import { GamificationStatePill } from "@/components/gamification/badge-ui";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { BadgeSurface } from "@/components/gamification/badge-surface";
import { BadgeModal } from "./BadgeModal";
import { formatCompactNumber, type BadgeFamily } from "./utils";
import type { buildInfiniteBadgeModel } from "./InfiniteBadge.model";

type BadgeModel = ReturnType<typeof buildInfiniteBadgeModel>;

type InfiniteBadgeViewProps = {
  description: string;
  total: number;
  step: number;
  unitLabel?: string;
  family?: BadgeFamily;
  model: BadgeModel;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export function InfiniteBadgeView({
  description,
  total,
  step,
  unitLabel,
  family,
  model,
  isOpen,
  onOpen,
  onClose,
}: InfiniteBadgeViewProps) {
  const { locale } = useSitePreferences();

  return (
    <>
      <button type="button" onClick={onOpen} className="group relative w-full text-left">
        <motion.div
          key={`${family ?? "default"}-${model.level}`}
          initial={{ opacity: 0.96, scale: 0.985, y: 2 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={`relative overflow-hidden rounded-3xl border p-5 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl ${model.styles.container}`}
        >
          <div className={`absolute inset-0 rounded-3xl ${model.styles.glow} blur-xl transition-opacity opacity-0 group-hover:opacity-100`} />
          <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full border-[6px] ${model.styles.ornament} pointer-events-none transition-transform duration-700 group-hover:rotate-45`} />
          <div className={`absolute -bottom-10 -right-4 h-24 w-24 rounded-full border-[4px] ${model.styles.ornament} pointer-events-none transition-transform duration-700 group-hover:-rotate-12`} />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <BadgeSurface
                icon={model.displayIcon}
                label={model.displayTitle}
                tone="gamification"
                variant="pill"
                className="inline-flex shadow-md"
              />
              <p className={`mt-3 text-xs font-bold ${model.styles.text} opacity-90`}>{description}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${model.styles.text} opacity-60`}>{model.displayRank}</p>
              <p className={`mt-1 text-3xl font-black tracking-tight ${model.styles.text} drop-shadow-md`}>Niv {model.level}</p>
              <div className="mt-2 flex justify-end"><GamificationStatePill state={model.state} /></div>
            </div>
          </div>

          <div className={`relative z-10 mt-5 ${model.styles.text}`}>
            <div className="flex items-center justify-between text-[11px] font-bold opacity-70">
              <span>{formatCompactNumber(total, locale)}{unitLabel ? ` ${unitLabel}` : ""}</span>
              <span>{formatCompactNumber(model.next, locale)}{unitLabel ? ` ${unitLabel}` : ""}</span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-black/40 shadow-inner">
              <div
                key={`${family ?? "default"}-${model.level}-progress`}
                className={`h-full rounded-full transition-all duration-1000 ease-out ${model.styles.progress} cmm-gamification-progress`}
                style={{ width: `${Math.round(model.progress * 100)}%` }}
              />
            </div>
          </div>
        </motion.div>
      </button>
      <BadgeModal
        isOpen={isOpen}
        onClose={onClose}
        title={model.displayTitle}
        description={description}
        total={total}
        step={step}
        unitLabel={unitLabel}
        family={family}
      />
    </>
  );
}
