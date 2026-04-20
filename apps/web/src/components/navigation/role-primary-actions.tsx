"use client";

import Link from "next/link";
import { trackRoleCtaClick } from "@/lib/analytics/navigation-client";
import type { CtaSlot } from "@/lib/domain-language";
import { getProfileActions, type AppProfile } from "@/lib/profiles";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type RolePrimaryActionsProps = {
  profile: AppProfile;
  title?: string;
};

export function RolePrimaryActions({
  profile,
  title = "Actions principales",
}: RolePrimaryActionsProps) {
  const { locale, displayMode } = useSitePreferences();
  const allActions = getProfileActions(profile);
  
  // En mode simplifié, on ne garde que l'action prioritaire absolue
  const actions = displayMode === "simplifie" ? [allActions[0]] : allActions;

  function resolveCtaSlot(index: number): CtaSlot {
    if (index === 0) return "primary";
    if (index === 1) return "secondary";
    return "additional";
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm core-feature">
      <h2 className="text-base font-semibold text-slate-900 [data-display-mode='simplifie']_&:text-2xl [data-display-mode='simplifie']_&:font-black underline decoration-emerald-500 decoration-4 underline-offset-4">
        {title}
      </h2>
      <div className={`mt-4 grid gap-4 ${displayMode === 'simplifie' ? 'grid-cols-1' : 'md:grid-cols-3'}`}>
        {actions.map((action, index) => (
          <Link
            key={`${action.href}-${index}`}
            href={action.href}
            onClick={() =>
              trackRoleCtaClick({
                profile,
                ctaType: resolveCtaSlot(index),
                href: action.href,
                label: action.label[locale],
              })
            }
            className={`rounded-xl border px-5 py-4 transition-all duration-200 ${
              index === 0
                ? "border-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 [data-display-mode='simplifie']_&:bg-emerald-600 [data-display-mode='simplifie']_&:text-white [data-display-mode='simplifie']_&:border-none"
                : "border-slate-200 bg-white text-slate-800 hover:border-emerald-200 hover:bg-emerald-50"
            } ${displayMode === 'simplifie' ? 'scale-105 shadow-xl' : ''}`}
          >
            <p className={`font-black ${displayMode === 'simplifie' ? 'text-xl' : 'text-sm'}`}>
              {action.label[locale]}
            </p>
            <p className={`mt-1 text-slate-500 font-medium ${displayMode === 'simplifie' ? 'text-base opacity-90' : 'text-xs'}`}>
              {action.description[locale]}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
