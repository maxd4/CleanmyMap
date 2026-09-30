import type { ReactNode } from "react";
import type { MeResponse } from "./gamification-types";

export type GamificationPanelProps = {
  progression: MeResponse["progression"] | undefined;
  loading: boolean;
  error: unknown;
  locale: string;
};

export function GamificationPanelShell({
  children,
  id,
  tabIndex,
}: {
  children: ReactNode;
  id?: string;
  tabIndex?: number;
}) {
  return (
    <section id={id} tabIndex={tabIndex} className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c51f1f] lg:p-7">
      {children}
    </section>
  );
}

export function GamificationPanelSkeleton({
  ariaLabel,
  blocks,
}: {
  ariaLabel: string;
  blocks: number;
}) {
  return (
    <GamificationPanelShell>
      <div className="animate-pulse space-y-5" aria-label={ariaLabel}>
        <div className="h-4 w-48 rounded-full bg-[#f5e7e2]" />
        <div className="h-8 w-80 rounded-full bg-[#f5e7e2]" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: blocks }, (_, index) => (
            <div key={index} className="h-28 rounded-[1.5rem] bg-[#fff8f6]" />
          ))}
        </div>
      </div>
    </GamificationPanelShell>
  );
}
