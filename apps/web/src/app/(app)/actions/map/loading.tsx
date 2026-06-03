import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { MapLoadingState } from "@/components/actions/map-feed/_layouts/map-loading-state";

export default function Loading() {
  return (
    <main className="min-h-screen pb-24 text-slate-950">
      <div className="mx-auto max-w-[1680px] space-y-10 px-6 py-8">
        <header className="relative space-y-8 pt-10 lg:pt-12">
          <div className="absolute -left-24 -top-24 h-[600px] w-[600px] rounded-full bg-sky-500/10 blur-[120px]" />

          <div className="max-w-4xl space-y-4">
            <CmmSkeleton variant="text" className="w-44" />
            <CmmSkeleton variant="title" className="w-96" />
            <CmmSkeleton variant="text" className="w-[32rem]" />
          </div>

          <div className="flex flex-wrap gap-3">
            <CmmSkeleton variant="rectangular" className="h-11 w-32 rounded-full" />
            <CmmSkeleton variant="rectangular" className="h-11 w-36 rounded-full" />
            <CmmSkeleton variant="rectangular" className="h-11 w-36 rounded-full" />
          </div>
        </header>

        <section className="relative left-1/2 right-1/2 mx-auto w-[calc(100vw-1rem)] -translate-x-1/2 lg:w-[calc(100vw-1.5rem)]">
          <MapLoadingState fullViewport />
        </section>

        <div className="mx-auto max-w-[1680px] space-y-10 px-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.62fr)_minmax(340px,0.88fr)]">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <CmmSkeleton variant="stat" />
                <CmmSkeleton variant="stat" />
                <CmmSkeleton variant="stat" />
                <CmmSkeleton variant="stat" />
              </div>

              <section className="rounded-[3rem] border border-sky-200/70 bg-sky-50/90 p-8 shadow-[0_24px_56px_-32px_rgba(14,165,233,0.22)]">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-2">
                    <CmmSkeleton variant="text" className="w-32" />
                    <CmmSkeleton variant="text" className="w-56" />
                  </div>
                  <CmmSkeleton variant="rectangular" className="h-12 w-44 rounded-[2rem]" />
                </div>
                <div className="mt-8 min-h-[20rem] rounded-[2.25rem] border border-sky-200/80 bg-white/80 p-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <CmmSkeleton variant="card" className="h-64" />
                    <CmmSkeleton variant="card" className="h-64" />
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-4 self-start xl:sticky xl:top-8">
              <section className="rounded-[3rem] border border-sky-200/70 bg-sky-50/90 p-6 shadow-[0_24px_56px_-32px_rgba(14,165,233,0.22)]">
                <CmmSkeleton variant="card" className="h-[28rem]" />
              </section>

              <section className="rounded-[3rem] border border-sky-200/70 bg-sky-50/90 p-6 shadow-[0_24px_56px_-32px_rgba(14,165,233,0.22)]">
                <CmmSkeleton variant="card" className="h-44" />
              </section>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
