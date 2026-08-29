"use client";

import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";

type LegalAccordionProps = {
  children: ReactNode;
  title: string;
};

export function LegalAccordion({ children, title }: LegalAccordionProps) {
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [isBubbleHovered, setIsBubbleHovered] = useState(false);
  const isOpen = isPinnedOpen || isBubbleHovered;

  const handleSummaryClick = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setIsPinnedOpen((current) => !current);
  };

  return (
    <details
      open={isOpen}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors open:border-blue-200 open:bg-blue-50/30"
    >
      <summary
        onClick={handleSummaryClick}
        className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset [&::-webkit-details-marker]:hidden"
      >
        <span
          aria-hidden="true"
          data-hover-toggle="true"
          onMouseEnter={() => setIsBubbleHovered(true)}
          onMouseLeave={() => setIsBubbleHovered(false)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl font-semibold leading-none text-slate-700 transition-colors hover:bg-blue-100 hover:text-blue-700"
        >
          &gt;
        </span>
        <span role="heading" aria-level={2} className="min-w-0 flex-1 text-base font-bold tracking-[-0.015em] text-slate-900 sm:text-lg">
          {title}
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600">
          <Plus className="h-4 w-4 group-open:hidden" aria-hidden="true" />
          <Minus className="hidden h-4 w-4 group-open:block" aria-hidden="true" />
        </span>
      </summary>
      <div className="border-t border-slate-200/80 px-4 pb-5 pt-4 sm:px-5">{children}</div>
    </details>
  );
}
