import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function LightCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[2.15rem] border border-slate-200/80 bg-white/90 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
