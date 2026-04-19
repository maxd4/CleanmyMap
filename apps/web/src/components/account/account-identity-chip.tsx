"use client";

import type { UserIdentity } from "@/lib/authz";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { IdentityBadge } from "@/components/ui/identity-badge";

const DISPLAY_MODE_BADGES = {
  exhaustif: { id: "mode_exhaustif", label: "Mode exhaustif", icon: "MEX" },
  sobre: { id: "mode_sobre", label: "Mode sobre", icon: "MSO" },
  simplifie: { id: "mode_simplifie", label: "Mode simplifie", icon: "MSI" },
} as const;

type AccountIdentityChipProps = {
  identity: UserIdentity;
};

export function AccountIdentityChip({ identity }: AccountIdentityChipProps) {
  const { displayMode } = useSitePreferences();
  const roleBadge = identity.badges.find((badge) =>
    badge.id.startsWith("role_"),
  );
  const modeBadge = DISPLAY_MODE_BADGES[displayMode];
  const gamificationBadges = identity.badges.filter(
    (badge) =>
      badge.id !== "admin" &&
      !badge.id.startsWith("role_") &&
      !badge.id.startsWith("profile_"),
  );

  return (
    <div className="flex items-center gap-2">
      <div className="text-right">
        <p className="text-sm font-semibold text-slate-800">
          {identity.displayName}
        </p>
        <p className="text-xs text-slate-500">
          @{identity.username} · Niveau {identity.currentLevel}
        </p>
      </div>

      {roleBadge ? (
        <IdentityBadge
          icon={roleBadge.icon}
          label={roleBadge.label}
          tone="role"
        />
      ) : null}

      <IdentityBadge icon={modeBadge.icon} label={modeBadge.label} tone="mode" />

      {gamificationBadges.length > 0 ? (
        <details className="group relative">
          <summary className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-600 transition hover:bg-slate-100">
            i
          </summary>
          <div className="absolute right-0 top-9 z-40 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Badges gamification
            </p>
            <ul className="mt-2 space-y-1">
              {gamificationBadges.map((badge) => (
                <li
                  key={badge.id}
                  className="flex items-center gap-2 text-sm text-slate-700"
                >
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
