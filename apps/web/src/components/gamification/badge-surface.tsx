"use client";

import { BadgePictogram } from "./badge-icon";

export type BadgeSurfaceTone =
  | "admin"
  | "role"
  | "profile"
  | "mode"
  | "gamification"
  | "neutral";

type BadgeSurfaceProps = {
  icon: string;
  label: string;
  tone: BadgeSurfaceTone;
  variant?: "pill" | "tile" | "orb";
  className?: string;
};

const SURFACE_TONES: Record<
  BadgeSurfaceTone,
  {
    shell: string;
    iconShell: string;
    text: string;
  }
> = {
  admin: {
    shell:
      "border-rose-500/20 bg-rose-50/80 text-rose-800 shadow-sm shadow-rose-200/30 dark:bg-rose-500/10 dark:text-rose-200",
    iconShell: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
    text: "text-rose-800 dark:text-rose-200",
  },
  role: {
    shell:
      "border-sky-500/20 bg-sky-50/80 text-sky-800 shadow-sm shadow-sky-200/30 dark:bg-sky-500/10 dark:text-sky-200",
    iconShell: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
    text: "text-sky-800 dark:text-sky-200",
  },
  profile: {
    shell:
      "border-cyan-500/20 bg-cyan-50/80 text-cyan-800 shadow-sm shadow-cyan-200/30 dark:bg-cyan-500/10 dark:text-cyan-100",
    iconShell:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-100",
    text: "text-cyan-800 dark:text-cyan-100",
  },
  gamification: {
    shell:
      "border-blue-500/20 bg-blue-50/80 text-blue-800 shadow-sm shadow-blue-200/30 dark:bg-blue-500/10 dark:text-blue-100",
    iconShell: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-100",
    text: "text-blue-800 dark:text-blue-100",
  },
  mode: {
    shell:
      "border-amber-500/20 bg-amber-50/80 text-amber-900 shadow-sm shadow-amber-200/30 dark:bg-amber-500/10 dark:text-amber-100",
    iconShell:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100",
    text: "text-amber-900 dark:text-amber-100",
  },
  neutral: {
    shell:
      "border-slate-300/60 bg-white/85 text-slate-700 shadow-sm shadow-slate-200/30 dark:bg-slate-500/10 dark:text-slate-200",
    iconShell:
      "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200",
    text: "text-slate-700 dark:text-slate-200",
  },
};

const VARIANT_CLASSNAMES: Record<
  NonNullable<BadgeSurfaceProps["variant"]>,
  string
> = {
  pill: "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-tight backdrop-blur-sm transition-transform hover:scale-[1.02]",
  tile: "inline-flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold tracking-tight backdrop-blur-sm transition-transform hover:scale-[1.02]",
  orb: "inline-flex items-center justify-center rounded-full border p-2 backdrop-blur-sm transition-transform hover:scale-[1.04]",
};

export function BadgeSurface({
  icon,
  label,
  tone,
  variant = "pill",
  className,
}: BadgeSurfaceProps) {
  const surface = SURFACE_TONES[tone];

  if (variant === "orb") {
    return (
      <span
        role="img"
        aria-label={label}
        className={`${VARIANT_CLASSNAMES.orb} ${surface.shell} ${className ?? ""}`}
      >
        <span className={`inline-flex items-center justify-center rounded-full p-1.5 ${surface.iconShell}`}>
          <BadgePictogram name={icon} size={14} />
        </span>
      </span>
    );
  }

  const isTile = variant === "tile";
  return (
    <span
      role="status"
      aria-label={label}
      className={`${VARIANT_CLASSNAMES[variant]} ${surface.shell} ${className ?? ""}`}
    >
      <span className={`inline-flex items-center justify-center rounded-full ${isTile ? "p-2.5" : "p-1.5"} ${surface.iconShell}`}>
        <BadgePictogram name={icon} size={isTile ? 15 : 12} />
      </span>
      <span className={`min-w-0 ${surface.text}`}>{label}</span>
    </span>
  );
}
