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
  tone?: "light" | "dark" | "warm";
};

function resolveCtaSlot(index: number): CtaSlot {
  if (index === 0) return "primary";
  if (index === 1) return "secondary";
  return "additional";
}

type ToneTheme = {
  section: string;
  heading: string;
  primaryCard: string;
  secondaryCard: string;
  slotPrimary: string;
  slotSecondary: string;
  badgePrimary: string;
  badgeSecondary: string;
  titlePrimary: string;
  titleSecondary: string;
  detailPrimary: string;
  detailSecondary: string;
};

const TONE_THEMES: Record<NonNullable<RolePrimaryActionsProps["tone"]>, ToneTheme> = {
  light: {
    section: "border-slate-200 bg-white",
    heading: "cmm-text-primary decoration-emerald-500",
    primaryCard: "border-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 [data-display-mode='minimaliste']_&:border-none [data-display-mode='minimaliste']_&:bg-emerald-600 [data-display-mode='minimaliste']_&:text-white",
    secondaryCard: "border-slate-200 bg-white cmm-text-primary hover:border-emerald-200 hover:bg-emerald-50",
    slotPrimary: "text-emerald-700",
    slotSecondary: "text-slate-500",
    badgePrimary: "border-emerald-200 bg-white/70 text-emerald-700",
    badgeSecondary: "border-slate-200 bg-slate-50 text-slate-500",
    titlePrimary: "",
    titleSecondary: "",
    detailPrimary: "opacity-90",
    detailSecondary: "cmm-text-caption cmm-text-muted",
  },
  dark: {
    section: "border-white/10 bg-black/25",
    heading: "text-white decoration-amber-400",
    primaryCard:
      "border-amber-300/80 bg-amber-100 text-slate-900 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.7)] hover:bg-amber-50 hover:border-amber-400 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_-4px_rgba(0,0,0,0.25)]",
    secondaryCard:
      "border-orange-300/60 bg-orange-100/80 text-slate-900 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.6)] hover:bg-amber-100 hover:border-amber-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_-4px_rgba(0,0,0,0.2)]",
    slotPrimary: "text-amber-700",
    slotSecondary: "text-orange-600",
    badgePrimary: "border-amber-300/60 bg-amber-200/60 text-amber-900",
    badgeSecondary: "border-orange-200/60 bg-orange-100/60 text-orange-800",
    titlePrimary: "text-slate-900",
    titleSecondary: "text-slate-900",
    detailPrimary: "text-slate-600",
    detailSecondary: "text-slate-600",
  },
  warm: {
    section:
      "border-amber-200/20 bg-[linear-gradient(145deg,rgba(44,28,15,0.76)_0%,rgba(124,53,15,0.78)_52%,rgba(245,158,11,0.24)_100%)]",
    heading: "text-white decoration-amber-300",
    primaryCard:
      "border-amber-200/30 bg-[linear-gradient(135deg,rgba(69,26,3,0.88)_0%,rgba(124,45,18,0.86)_52%,rgba(251,146,60,0.36)_100%)] text-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12)] hover:border-amber-200/50 hover:bg-[linear-gradient(135deg,rgba(82,33,8,0.90)_0%,rgba(154,52,18,0.88)_52%,rgba(245,158,11,0.42)_100%)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.24)]",
    secondaryCard:
      "border-orange-200/25 bg-[linear-gradient(135deg,rgba(59,29,9,0.82)_0%,rgba(124,53,15,0.78)_52%,rgba(251,146,60,0.28)_100%)] text-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.10)] hover:border-orange-200/40 hover:bg-[linear-gradient(135deg,rgba(82,33,8,0.88)_0%,rgba(154,52,18,0.84)_52%,rgba(245,158,11,0.34)_100%)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.2)]",
    slotPrimary: "text-amber-100",
    slotSecondary: "text-orange-100",
    badgePrimary: "border-amber-200/30 bg-amber-100/18 text-amber-50",
    badgeSecondary: "border-orange-200/22 bg-orange-100/14 text-orange-50",
    titlePrimary: "text-white",
    titleSecondary: "text-white",
    detailPrimary: "text-white/92",
    detailSecondary: "text-white/78",
  },
};

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

  const theme = TONE_THEMES[tone];

  return (
    <section
      className={cn("rounded-3xl border p-5 transition-all duration-500", theme.section)}
    >
      <h2
        className={cn(
          "text-base font-semibold underline decoration-4 underline-offset-4 [data-display-mode='minimaliste']_&:text-2xl [data-display-mode='minimaliste']_&:font-bold",
          theme.heading,
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
                isPrimary ? theme.primaryCard : theme.secondaryCard,
                displayMode === "minimaliste" ? "scale-105 shadow-xl" : "",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p
                  className={cn(
                    "text-xs font-black uppercase tracking-[0.24em]",
                    isPrimary ? theme.slotPrimary : theme.slotSecondary,
                  )}
                >
                  {slotLabel[locale]}
                </p>
                <span
                  className={cn(
                    "rounded-full border px-2 py-1 text-xs font-bold uppercase tracking-[0.18em]",
                    isPrimary ? theme.badgePrimary : theme.badgeSecondary,
                  )}
                >
                  {index === 0
                    ? locale === "fr"
                      ? "Prioritaire"
                      : "Priority"
                    : locale === "fr"
                      ? "Rapide"
                      : "Quick"}
                </span>
              </div>

              <div className="mt-4 space-y-1">
                <p
                  className={cn(
                    "font-bold",
                    displayMode === "minimaliste" ? "text-xl" : "text-lg",
                    isPrimary ? theme.titlePrimary : theme.titleSecondary,
                  )}
                >
                  {action.label[locale]}
                </p>
                <p
                  className={cn(
                    "mt-1 font-medium",
                    displayMode === "minimaliste"
                      ? "text-base"
                      : "text-sm",
                    isPrimary ? theme.detailPrimary : theme.detailSecondary,
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
