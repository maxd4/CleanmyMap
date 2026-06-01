"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type GamificationToastTone = "explorer" | "forms" | "clean-zones" | "actions" | "generic";

type GamificationToastProps = {
  title?: string;
  message: string;
  icon?: string;
  tone?: GamificationToastTone;
  onClose?: () => void;
};

const TOAST_STYLES: Record<GamificationToastTone, { shell: string; badge: string; glow: string }> = {
  explorer: {
    shell: "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white text-amber-950 shadow-[0_18px_40px_-24px_rgba(245,158,11,0.45)]",
    badge: "bg-amber-100 text-amber-700",
    glow: "bg-amber-300/25",
  },
  forms: {
    shell: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white text-emerald-950 shadow-[0_18px_40px_-24px_rgba(16,185,129,0.45)]",
    badge: "bg-emerald-100 text-emerald-700",
    glow: "bg-emerald-300/25",
  },
  "clean-zones": {
    shell: "border-sky-200/80 bg-gradient-to-br from-sky-50 to-white text-sky-950 shadow-[0_18px_40px_-24px_rgba(14,165,233,0.4)]",
    badge: "bg-sky-100 text-sky-700",
    glow: "bg-sky-300/25",
  },
  actions: {
    shell: "border-violet-200/80 bg-gradient-to-br from-violet-50 to-white text-violet-950 shadow-[0_18px_40px_-24px_rgba(139,92,246,0.4)]",
    badge: "bg-violet-100 text-violet-700",
    glow: "bg-violet-300/25",
  },
  generic: {
    shell: "border-slate-200 bg-white text-slate-950 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.25)]",
    badge: "bg-slate-100 text-slate-700",
    glow: "bg-slate-300/20",
  },
};

export default function GamificationToast({
  title = "Palier atteint",
  message,
  icon = "✨",
  tone = "generic",
  onClose,
}: GamificationToastProps) {
  const styles = TOAST_STYLES[tone];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border p-4 backdrop-blur-xl cmm-gamification-toast-shell",
        styles.shell,
      )}
    >
      <div className={cn("absolute -right-10 -top-10 h-24 w-24 rounded-full blur-2xl", styles.glow)} />
      <div className="relative flex gap-3">
        <div className={cn("mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-black", styles.badge)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-60">
            {title}
          </p>
          <p className="mt-1 text-sm font-semibold leading-relaxed opacity-90">
            {message}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1 opacity-50 transition hover:bg-black/5 hover:opacity-80"
            aria-label="Fermer la notification de gamification"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
