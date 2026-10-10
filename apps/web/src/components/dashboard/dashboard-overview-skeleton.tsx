export function DashboardOverviewSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-44 rounded-3xl bg-[rgba(44,28,15,0.55)] border border-orange-200/18"
          />
        ))}
      </div>
      <div className="h-36 rounded-3xl bg-[rgba(44,28,15,0.55)] border border-orange-200/18" />
    </div>
  );
}
