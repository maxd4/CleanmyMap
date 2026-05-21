export default function Loading() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-8">
      <div className="animate-pulse rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4 shadow-sm backdrop-blur-xl">
        <div className="h-4 w-32 rounded-full bg-white/[0.12]" />
        <div className="mt-3 h-8 w-[min(22rem,100%)] rounded-full bg-white/[0.12]" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-sm backdrop-blur-xl">
          <div className="h-5 w-40 rounded-full bg-white/[0.12]" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-32 rounded-[1.5rem] bg-white/[0.08]" />
            <div className="h-32 rounded-[1.5rem] bg-white/[0.08]" />
            <div className="h-32 rounded-[1.5rem] bg-white/[0.08]" />
          </div>
        </div>

        <div className="animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-sm backdrop-blur-xl">
          <div className="h-5 w-28 rounded-full bg-white/[0.12]" />
          <div className="mt-4 space-y-3">
            <div className="h-4 rounded-full bg-white/[0.10]" />
            <div className="h-4 rounded-full bg-white/[0.10]" />
            <div className="h-4 w-5/6 rounded-full bg-white/[0.10]" />
          </div>
        </div>
      </div>
    </div>
  );
}
