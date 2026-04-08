import type { UserIdentity } from "@/lib/authz";

type AccountIdentityChipProps = {
  identity: UserIdentity;
};

export function AccountIdentityChip({ identity }: AccountIdentityChipProps) {
  const adminBadge = identity.badges.find((badge) => badge.id === "admin");
  const otherBadges = identity.badges.filter((badge) => badge.id !== "admin");

  return (
    <div className="flex items-center gap-2">
      <div className="text-right">
        <p className="text-sm font-semibold text-slate-800">{identity.displayName}</p>
        <p className="text-xs text-slate-500">@{identity.username}</p>
      </div>

      {adminBadge ? (
        <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
          {adminBadge.icon} {adminBadge.label}
        </span>
      ) : null}

      {otherBadges.length > 0 ? (
        <details className="group relative">
          <summary className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-600 transition hover:bg-slate-100">
            i
          </summary>
          <div className="absolute right-0 top-9 z-40 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Badges debloques</p>
            <ul className="mt-2 space-y-1">
              {otherBadges.map((badge) => (
                <li key={badge.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="inline-flex min-w-8 justify-center rounded-md border border-slate-200 bg-slate-50 px-1 py-0.5 text-[11px] font-semibold">
                    {badge.icon}
                  </span>
                  <span>{badge.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      ) : null}
    </div>
  );
}
