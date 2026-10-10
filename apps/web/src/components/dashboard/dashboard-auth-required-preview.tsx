import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";

export function DashboardAuthRequiredPreview() {
  return (
    <ClerkRequiredGate
      isAuthenticated={false}
      mode="blur"
      lockedPreview={
        <div className="grid gap-3 rounded-3xl border border-amber-200/18 bg-[linear-gradient(145deg,rgba(44,28,15,0.78)_0%,rgba(92,45,12,0.84)_56%,rgba(245,158,11,0.26)_100%)] p-6 shadow-[0_18px_42px_-26px_rgba(124,45,18,0.30)] md:grid-cols-3">
          {["Aujourd'hui", "Priorité", "Accès"].map((label) => (
            <div
              key={label}
              className="rounded-2xl border border-amber-200/18 bg-[rgba(69,26,3,0.58)] p-5"
            >
              <p className="cmm-text-caption font-bold uppercase tracking-widest text-amber-100">
                {label}
              </p>
              <div className="mt-3 h-3 w-3/4 rounded bg-amber-200/22" />
            </div>
          ))}
        </div>
      }
    >
      <div />
    </ClerkRequiredGate>
  );
}
