import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MethodologyColor = "sky" | "emerald" | "slate" | "rose";

const METHODLOGY_COLOR_CLASSES: Record<
  MethodologyColor,
  { accent: string; surface: string; border: string; dot: string }
> = {
  sky: {
    accent: "text-sky-400",
    surface: "bg-sky-400/5",
    border: "border-sky-400/20",
    dot: "bg-sky-400",
  },
  emerald: {
    accent: "text-emerald-400",
    surface: "bg-emerald-400/5",
    border: "border-emerald-400/20",
    dot: "bg-emerald-400",
  },
  slate: {
    accent: "text-slate-400",
    surface: "bg-slate-400/5",
    border: "border-slate-400/20",
    dot: "bg-slate-400",
  },
  rose: {
    accent: "text-rose-400",
    surface: "bg-rose-400/5",
    border: "border-rose-400/20",
    dot: "bg-rose-400",
  },
};

export function MethodologyCard({
  title,
  formula,
  description,
  source,
  color,
  icon,
}: {
  title: string;
  formula: string;
  description: string;
  source: string;
  color: MethodologyColor;
  icon: ReactNode;
}) {
  const styles = METHODLOGY_COLOR_CLASSES[color];

  return (
    <div className="group relative overflow-hidden rounded-[3rem] border border-white/5 bg-white/5 p-10 space-y-8 transition-all duration-700 hover:border-white/10 hover:bg-white/[0.07]">
      <div className={cn("relative z-10 flex items-center gap-5", styles.accent)}>
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner transition-transform duration-700 group-hover:scale-110",
            styles.surface,
          )}
        >
          {icon}
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white">{title}</h2>
      </div>

      <div
        className={cn(
          "relative z-10 rounded-[2rem] border-l-4 bg-black/20 p-8 font-mono text-sm shadow-inner",
          styles.border,
        )}
      >
        <div className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/20">
          Équation Scientifique
        </div>
        <div className="leading-relaxed text-sky-100/80">{formula}</div>
      </div>

      <p className="relative z-10 font-medium leading-relaxed text-sky-100/40">
        {description}
      </p>

      <div className="relative z-10 flex items-center gap-3 pt-6">
        <div className={cn("h-2 w-2 rounded-full", styles.dot)} />
        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
          Source : {source}
        </span>
      </div>
    </div>
  );
}
