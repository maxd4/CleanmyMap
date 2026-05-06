"use client";

import { motion } from "framer-motion";
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
}: ChannelButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`relative flex w-full items-start gap-3 rounded-[1.5rem] border p-3 text-left transition-all duration-300 group ${
        active
          ? "border-violet-200 bg-violet-600 text-white shadow-2xl shadow-violet-600/30 dark:border-violet-500/40"
          : "border-transparent bg-white/60 text-slate-600 hover:border-slate-200 hover:bg-white hover:shadow-lg dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900"
      } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors ${
          active ? "bg-white/15 text-white" : chipClass
        }`}
      >
        <Icon size={18} className={active ? "text-white" : accentClass} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-black uppercase tracking-widest leading-none">
              {label}
            </span>
            <span
              className={`mt-1 block text-[10px] leading-tight ${
                active ? "text-white/75" : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {description}
            </span>
          </div>
          {count !== undefined ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                active
                  ? "bg-white/15 text-white"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {count}
            </span>
          ) : null}
        </div>
      </div>
      {active ? (
        <motion.div
          layoutId="active-channel"
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
