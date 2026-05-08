"use client";

import Link from "next/link";
import { trackRoleCtaClick } from "@/lib/analytics/navigation-client";
import type { CtaSlot } from "@/lib/domain-language";
import { getProfileActions, type AppProfile } from "@/lib/profiles";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { cn } from "@/lib/utils";

const ACTION_SLOT_LABELS = [
  { fr: "Faire maintenant", en: "Act now" },
  { fr: "Gérer", en: "Manage" },
  { fr: "Vérifier", en: "Check" },
  { fr: "Approfondir", en: "Explore" },
] as const;

type RolePrimaryActionsProps = {
  profile: AppProfile;
  title?: string;
  tone?: "light" | "dark";
};

function resolveCtaSlot(index: number): CtaSlot {
  if (index === 0) return "primary";
  if (index === 1) return "secondary";
  return "additional";
}

export function RolePrimaryActions({
  profile,
  title = "Actions principales",
  tone = "light",
}: RolePrimaryActionsProps) {
  const { locale, displayMode } = useSitePreferences();
  const allActions = getProfileActions(profile);
  const primaryAction = allActions[0];
  const actions =
    displayMode === "minimaliste" ? (primaryAction ? [primaryAction] : []) : allActions;

  const gridClassName =
    displayMode === "minimaliste"
      ? "grid-cols-1"
      : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";

  return (
    <section
      className={cn(
        "rounded-3xl border p-5 transition-all duration-500",
        tone === "dark"
          ? "border-white/10 bg-black/25"
          : "border-slate-200 bg-white",
      )}
    >
      <h2
        className={cn(
          "text-base font-semibold underline decoration-4 underline-offset-4 [data-display-mode='minimaliste']_&:text-2xl [data-display-mode='minimaliste']_&:font-bold",
          tone === "dark"
            ? "text-white decoration-amber-400"
            : "cmm-text-primary decoration-emerald-500",
        )}
      >
        {title}
      </h2>

      <div className={cn("mt-4 grid gap-4", gridClassName)}>
        {actions.map((action, index) => {
          const isPrimary = index === 0;
          const slotLabel =
            ACTION_SLOT_LABELS[index] ?? ACTION_SLOT_LABELS[ACTION_SLOT_LABELS.length - 1];

          return (
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
              className={cn(
                "group flex h-full flex-col justify-between rounded-2xl border px-5 py-4 transition-all duration-200",
                tone === "dark"
                  ? isPrimary
                    ? "border-amber-300/80 bg-amber-100 text-slate-900 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.7)] hover:bg-amber-50 hover:border-amber-400 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_-4px_rgba(0,0,0,0.25)]"
                    : "border-orange-300/60 bg-orange-100/80 text-slate-900 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.6)] hover:bg-amber-100 hover:border-amber-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_-4px_rgba(0,0,0,0.2)]"
                  : isPrimary
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 [data-display-mode='minimaliste']_&:border-none [data-display-mode='minimaliste']_&:bg-emerald-600 [data-display-mode='minimaliste']_&:text-white"
                    : "border-slate-200 bg-white cmm-text-primary hover:border-emerald-200 hover:bg-emerald-50",
                displayMode === "minimaliste" ? "scale-105 shadow-xl" : "",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p
                  className={cn(
                    "text-xs font-black uppercase tracking-[0.24em]",
                    tone === "dark"
                      ? isPrimary
                        ? "text-amber-700"
                        : "text-orange-600"
                      : isPrimary
                        ? "text-emerald-700"
                        : "text-slate-500",
                  )}
                >
                  {slotLabel[locale]}
                </p>
                <span
                  className={cn(
                    "rounded-full border px-2 py-1 text-xs font-bold uppercase tracking-[0.18em]",
                    tone === "dark"
                      ? isPrimary
                        ? "border-amber-300/60 bg-amber-200/60 text-amber-900"
                        : "border-orange-200/60 bg-orange-100/60 text-orange-800"
                      : isPrimary
                        ? "border-emerald-200 bg-white/70 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-500",
                  )}
                >
                  {index === 0 ? (locale === "fr" ? "Prioritaire" : "Priority") : (locale === "fr" ? "Rapide" : "Quick")}
                </span>
              </div>

              <div className="mt-4 space-y-1">
                <p className={cn("font-bold", displayMode === "minimaliste" ? "text-xl" : "text-lg",
                  tone === "dark" ? "text-slate-900" : ""
                )}>
                  {action.label[locale]}
                </p>
                <p
                  className={cn(
                    "mt-1 font-medium",
                    tone === "dark"
                      ? displayMode === "minimaliste"
                        ? "text-base text-slate-900"
                        : "text-sm text-slate-600"
                      : displayMode === "minimaliste"
                        ? "text-base opacity-90"
                        : "cmm-text-caption cmm-text-muted",
                  )}
                >
                  {action.description[locale]}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
