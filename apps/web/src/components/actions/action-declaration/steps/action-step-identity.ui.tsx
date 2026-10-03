import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const inputCls =
  "w-full h-12 pl-10 pr-4 rounded-xl border border-emerald-200/70 bg-[#F3FBF6] text-sm font-medium text-emerald-950 placeholder:text-emerald-700/35 focus:outline-none focus:ring-2 focus:ring-emerald-500/18 focus:border-emerald-400 transition-all";

export const inputErrCls =
  "border-rose-400 ring-2 ring-rose-400/20 focus:border-rose-400 focus:ring-rose-400/20";

export const compactInputCls =
  "w-full min-h-12 rounded-xl border border-emerald-200/70 bg-white px-3.5 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:ring-emerald-500/15";

export function SectionTitle({
  color,
  children,
}: {
  color: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className={cn("h-1 w-6 rounded-full", color)} />
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-900/60">
        {children}
      </h3>
    </div>
  );
}

export function Field({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-900/30">
        <Icon size={16} />
      </div>
      {children}
    </div>
  );
}
