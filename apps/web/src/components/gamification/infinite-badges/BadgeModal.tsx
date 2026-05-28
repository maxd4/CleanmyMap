"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useMemo } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { useTranslation } from "@/lib/i18n/use-translation";
import { formatCompactNumber, nextThreshold } from "./utils";

type BadgeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  total: number;
  step: number;
  unitLabel?: string;
};

export function BadgeModal({
  isOpen,
  onClose,
  title,
  description,
  total,
  step,
  unitLabel,
}: BadgeModalProps) {
  const { locale } = useSitePreferences();
  const { t } = useTranslation("gamification");

  const next = useMemo(() => {
    const level = Math.floor(Math.max(0, total) / step);
    return nextThreshold(level, step);
  }, [step, total]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 18 }}
              className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-2xl pointer-events-auto sm:p-8"
              role="dialog"
              aria-modal="true"
              aria-label={title}
            >
              <button
                onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
                aria-label={t("badge.modal.close")}
              >
                <X size={18} />
              </button>

              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {t("badge.modal.eyebrow")}
                  </p>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">
                    {title}
                  </h2>
                  <p className="text-sm font-semibold text-slate-500">
                    {description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {t("badge.modal.total")}
                    </p>
                    <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
                      {formatCompactNumber(total, locale)}
                      {unitLabel ? (
                        <span className="ml-2 text-sm font-black text-slate-400">
                          {unitLabel}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {t("badge.modal.next")}
                    </p>
                    <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
                      {formatCompactNumber(next, locale)}
                      {unitLabel ? (
                        <span className="ml-2 text-sm font-black text-slate-400">
                          {unitLabel}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-bold text-emerald-900">
                    {t("badge.modal.claimHint")}
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-black text-white transition-all hover:bg-slate-800"
                >
                  {t("badge.modal.claim")}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

