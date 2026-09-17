"use client";

import { Lock, type LucideIcon } from "lucide-react";

type ChannelButtonProps = {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  description: string;
  count?: number;
  accentClass: string;
  chipClass: string;
  isLocked: boolean;
  tone?: "light" | "dark";
  compact?: boolean;
};

export function ChannelButton({
  active,
  disabled,
  onClick,
  icon: Icon,
  label,
  description,
  count,
  accentClass,
  chipClass,
  isLocked,
  tone = "dark",
  compact = false,
}: ChannelButtonProps) {
  const isLight = tone === "light";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={`group relative flex w-full items-start gap-3 border text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 ${compact ? "rounded-xl p-2" : "rounded-[1.5rem] p-3"} ${
        active
          ? isLight
            ? "border-rose-200 bg-rose-500 text-white shadow-2xl shadow-rose-500/20"
            : "border-pink-200 bg-pink-600 text-white shadow-2xl shadow-pink-600/30 dark:border-pink-500/40"
          : isLight
            ? "border-transparent bg-white/80 text-slate-700 hover:border-rose-200 hover:bg-white hover:shadow-lg"
            : "border-transparent bg-white/60 text-slate-600 hover:border-slate-200 hover:bg-white hover:shadow-lg dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900"
      } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-2xl transition-colors ${compact ? "h-8 w-8 rounded-xl" : "h-10 w-10"} ${
          active ? (isLight ? "bg-white/15 text-white" : "bg-white/15 text-white") : chipClass
        }`}
      >
        <Icon size={18} className={active ? "text-white" : accentClass} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <span className={`block ${compact ? "cmm-text-small" : "cmm-text-caption"} font-semibold leading-tight`}>
              {label}
            </span>
            <span
              className={`mt-1 block cmm-text-caption leading-tight ${
                active
                  ? "text-white"
                  : isLight
                    ? "text-slate-500"
                    : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {description}
            </span>
          </div>
          {count !== undefined ? (
            <span
              className={`rounded-full px-2 py-0.5 cmm-text-caption font-semibold ${
                active
                  ? "bg-white/15 text-white"
                  : isLight
                    ? "bg-rose-50 text-rose-500"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {count}
            </span>
          ) : null}
        </div>
      </div>
      {active ? (
        <div
          className="absolute right-3 top-3 h-2 w-2 rounded-full bg-white"
        />
      ) : null}
      {isLocked ? (
        <div className="absolute right-3 top-3 rounded-full bg-slate-900/80 p-1 text-white dark:bg-white/10">
          <Lock size={10} />
        </div>
      ) : null}
    </button>
  );
}
