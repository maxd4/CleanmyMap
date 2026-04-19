"use client";

import Link from "next/link";
import { trackRoleCtaClick } from "@/lib/analytics/navigation-client";
import type { CtaSlot } from "@/lib/domain-language";
import { getProfileActions, type AppProfile } from "@/lib/profiles";

type RolePrimaryActionsProps = {
  profile: AppProfile;
  title?: string;
};

export function RolePrimaryActions({
  profile,
  title = "Actions principales",
}: RolePrimaryActionsProps) {
  const actions = getProfileActions(profile);

  function resolveCtaSlot(index: number): CtaSlot {
    if (index === 0) return "primary";
    if (index === 1) return "secondary";
    return "additional";
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {actions.map((action, index) => (
          <Link
            key={`${action.href}-${index}`}
            href={action.href}
            onClick={() =>
              trackRoleCtaClick({
                profile,
                ctaType: resolveCtaSlot(index),
                href: action.href,
                label: action.label.fr,
              })
            }
            className={`rounded-xl border px-4 py-3 transition ${
              index === 0
                ? "border-emerald-300 bg-emerald-50 text-emerald-900 hover:border-emerald-400"
                : "border-slate-200 bg-white text-slate-800 hover:border-emerald-200 hover:bg-emerald-50"
            }`}
          >
            <p className="text-sm font-semibold">{action.label.fr}</p>
            <p className="mt-1 text-xs text-slate-500">
              {action.description.fr}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
