export default function Loading() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#061223] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(34,195,214,0.12),transparent),radial-gradient(ellipse_45%_45%_at_0%_100%,rgba(25,157,139,0.10),transparent)]" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-16 sm:px-8">
        <div className="w-full rounded-[2.25rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_28px_80px_-40px_rgba(6,17,35,0.9)] backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="animate-pulse space-y-6">
            <div className="h-4 w-28 rounded-full bg-white/[0.12]" />
            <div className="space-y-3">
              <div className="h-10 w-[min(34rem,100%)] rounded-full bg-white/[0.12]" />
              <div className="h-6 w-[min(26rem,92%)] rounded-full bg-white/[0.10]" />
              <div className="h-6 w-[min(18rem,72%)] rounded-full bg-white/[0.10]" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="h-36 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.08]" />
              <div className="h-36 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.08]" />
              <div className="h-36 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.08]" />
            </div>

            <div className="h-12 w-40 rounded-2xl bg-emerald-400/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
