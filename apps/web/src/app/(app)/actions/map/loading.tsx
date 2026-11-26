import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { CmmCard } from "@/components/ui/cmm-card";
import { PageHeader } from "@/components/ui/page-header";
import { MapLoadingState } from "@/components/actions/map-feed/_layouts/map-loading-state";
import { resolvePageFamily } from "@/lib/ui/page-families";

export default function Loading() {
  return (
    <>
      <div className="cmm-page-width px-4 pt-4 sm:px-6 sm:pt-5">
        <PageHeader
          family={resolvePageFamily("/actions/map")}
          title="Cartographie des actions"
          subtitle={<span className="inline-block h-4 w-[32rem] max-w-full animate-pulse rounded bg-slate-200/70 align-middle" aria-hidden="true" />}
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <CmmSkeleton variant="rectangular" className="h-11 w-32 rounded-full" />
              <CmmSkeleton variant="rectangular" className="h-11 w-36 rounded-full" />
            </div>
          }
        />
      </div>
      <div className="cmm-page-width space-y-4 px-3 py-4 pb-12 sm:space-y-5 sm:px-6 sm:pb-16">
        <div className="overflow-hidden rounded-2xl border border-[var(--cmm-surface-border)] bg-[var(--bg-elevated)] p-1.5 sm:p-2">
          <MapLoadingState fullViewport />
        </div>
        <CmmCard tone="family" size="sm">
          <CmmSkeleton variant="text" className="w-32" />
          <CmmSkeleton variant="text" className="mt-2 max-w-full w-56" />
        </CmmCard>
        <section className="space-y-3" aria-label="Chargement du bilan global">
          <CmmSkeleton variant="title" className="max-w-full w-64" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => <CmmSkeleton key={index} variant="stat" />)}
          </div>
        </section>
        <CmmCard size="sm" className="space-y-3">
          <CmmSkeleton variant="title" className="w-40" />
          <CmmSkeleton variant="card" className="h-20" />
        </CmmCard>
      </div>
    </>
  );
}
