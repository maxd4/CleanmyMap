"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useMemo } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { useTranslation } from "@/lib/i18n/use-translation";
import { computeBadgeRank, BADGE_TIER_STYLES, formatCompactNumber, nextThreshold } from "./utils";

type BadgeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  total: number;
  step: number;
  unitLabel?: string;
  family?: string;
};

export function BadgeModal({
  isOpen,
  onClose,
  title,
  description,
  total,
  step,
  unitLabel,
  family,
}: BadgeModalProps) {
  const { locale } = useSitePreferences();
  const { t } = useTranslation("gamification");

  const level = Math.floor(Math.max(0, total) / step);
  const rank = computeBadgeRank(level);
  const tier = rank.tier;
  const styles = BADGE_TIER_STYLES[tier];

  const next = useMemo(() => {
    return nextThreshold(level, step);
  }, [level, step]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`relative w-full max-w-md overflow-hidden rounded-[2.5rem] border p-6 sm:p-8 pointer-events-auto ${styles.modalContainer}`}
              role="dialog"
              aria-modal="true"
              aria-label={title}
            >
              {/* Ornements modaux géants */}
              <div className={`absolute -right-20 -top-20 h-64 w-64 rounded-full border-[16px] ${styles.ornament} pointer-events-none opacity-20`} />
              <div className={`absolute -bottom-32 -left-32 h-96 w-96 rounded-full border-[2px] ${styles.ornament} pointer-events-none opacity-30`} />

              <button
                onClick={onClose}
                className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full transition-colors z-20 ${styles.closeButton}`}
                aria-label={t("badge.modal.close")}
              >
                <X size={20} />
              </button>

              <div className="relative space-y-8 z-10">
                <div className="text-center space-y-3">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring" }}
                    className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full border-[4px] shadow-2xl ${styles.modalIconContainer}`}
                  >
                    <span className="text-5xl font-black drop-shadow-lg">{level}</span>
                  </motion.div>
                  <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${styles.text} opacity-70`}>
                    {rank.grade} {rank.subGrade} — Niveau {level}
                  </p>
                  <h2 className={`text-3xl font-black tracking-tight ${styles.text} drop-shadow-md`}>
                    {title}
                  </h2>
                  <p className={`text-sm font-semibold ${styles.text} opacity-80 px-4`}>
                    {description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={`rounded-3xl border p-4 ${styles.modalStatCard}`}>
                    <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${styles.text} opacity-60`}>
                      {t("badge.modal.total")}
                    </p>
                    <p className={`mt-2 text-2xl font-black tracking-tight ${styles.text}`}>
                      {formatCompactNumber(total, locale)}
                      {unitLabel ? (
                        <span className="ml-2 text-sm font-black opacity-60">
                          {unitLabel}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className={`rounded-3xl border p-4 ${styles.modalStatCard}`}>
                    <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${styles.text} opacity-60`}>
                      {t("badge.modal.next")}
                    </p>
                    <p className={`mt-2 text-2xl font-black tracking-tight ${styles.text}`}>
                      {formatCompactNumber(next, locale)}
                      {unitLabel ? (
                        <span className="ml-2 text-sm font-black opacity-60">
                          {unitLabel}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className={`w-full rounded-2xl py-4 text-sm font-black transition-all shadow-lg hover:-translate-y-0.5 ${styles.primaryButton}`}
                >
                  Continuer l'exploration
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

