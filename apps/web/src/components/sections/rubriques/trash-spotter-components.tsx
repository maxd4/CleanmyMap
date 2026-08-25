"use client";

import { memo } from "react";
import { ArrowRight, Clock3, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ActionMapItem } from "@/lib/actions/types";

type SpotterRecentListProps = {
  fr: boolean;
  recent: ActionMapItem[];
};

const statusToneClasses: Record<string, { dot: string; pill: string; label: string }> = {
  approved: {
    dot: "bg-emerald-500",
    pill: "border-emerald-200 bg-emerald-100 text-emerald-800",
    label: "Validé",
  },
  pending: {
    dot: "bg-amber-500",
    pill: "border-amber-200 bg-amber-100 text-amber-800",
    label: "En attente",
  },
  rejected: {
    dot: "bg-rose-500",
    pill: "border-rose-200 bg-rose-100 text-rose-800",
    label: "Refusé",
  },
  default: {
    dot: "bg-slate-400",
    pill: "border-slate-200 bg-slate-100 text-slate-700",
    label: "Publié",
  },
};

function formatRelativeTime(value: string, fr: boolean): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fr ? "Récemment" : "Recently";

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat(fr ? "fr" : "en", { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSeconds, "second");

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  return rtf.format(Math.round(diffHours / 24), "day");
}

function getStatusTone(status?: string | null) {
  return statusToneClasses[status ?? "default"] ?? statusToneClasses.default;
}

export const SpotterRecentList = memo(function SpotterRecentList({
  fr,
  recent,
}: SpotterRecentListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
            <Clock3 size={18} />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">
              {fr ? "Signalements récents" : "Recent reports"}
            </h3>
            <p className="text-sm font-medium text-slate-600">
              {fr ? "Dernières contributions reçues" : "Latest contributions received"}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800">
          {fr ? "En direct" : "Live"}
        </span>
      </div>

      <div className="space-y-3">
        {recent.slice(0, 5).map((spot) => {
          const statusTone = getStatusTone(spot.status);
          return (
            <motion.article
              key={spot.id}
              whileHover={{ y: -2 }}
              className="flex items-start gap-4 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.26)]"
            >
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                <MapPin size={18} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-black tracking-[-0.02em] text-slate-950">
                    {spot.location_label}
                  </p>
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                    statusTone.pill,
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", statusTone.dot)} />
                    {statusTone.label}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-600">
                  {formatRelativeTime(spot.action_date, fr)} · {spot.latitude !== null && spot.longitude !== null
                    ? `${spot.latitude.toFixed(4)}, ${spot.longitude.toFixed(4)}`
                    : fr ? "Sans coordonnées" : "No coordinates"}
                </p>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="truncate text-xs font-medium text-slate-500">{spot.location_label}</p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full px-0 py-0 text-xs font-black uppercase tracking-[0.18em] text-emerald-700 transition hover:text-emerald-800"
                  >
                    {fr ? "Voir" : "Open"}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </motion.article>
          );
        })}
        {recent.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-600">
            {fr ? "Aucun signalement récent pour le moment." : "No recent reports yet."}
          </div>
        ) : null}
      </div>
    </div>
  );
});
