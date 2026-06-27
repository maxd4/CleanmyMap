"use client";

import dynamic from "next/dynamic";
import { useInViewOnce } from "@/components/ui/use-in-view-once";
import type { ReportsWebDocumentProps } from "@/components/reports/reports-web-document";

const DeferredReportsWebDocumentComponent = dynamic(
  () => import("@/components/reports/reports-web-document").then((module) => module.ReportsWebDocument),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
        <div className="h-10 w-2/3 animate-pulse rounded-full bg-slate-100" />
        <div className="h-48 animate-pulse rounded-[1.5rem] bg-slate-100" />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    ),
  },
);

export function DeferredReportsWebDocument(props: ReportsWebDocumentProps) {
  const { ref, isInView } = useInViewOnce<HTMLDivElement>({
    rootMargin: "260px 0px",
  });

  return (
    <div ref={ref}>
      {isInView ? (
        <DeferredReportsWebDocumentComponent {...props} />
      ) : (
        <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
          <div className="h-10 w-2/3 animate-pulse rounded-full bg-slate-100" />
          <div className="h-48 animate-pulse rounded-[1.5rem] bg-slate-100" />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      )}
    </div>
  );
}
