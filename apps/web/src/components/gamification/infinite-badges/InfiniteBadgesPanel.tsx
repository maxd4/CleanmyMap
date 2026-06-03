"use client";

import { useMemo } from "react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { InfiniteBadge } from "./InfiniteBadge";
import { BADGE_STEP_DECHETS, BADGE_STEP_MEGOTS } from "@/config/gamification.config";
import { dispatchGamificationCelebration } from "@/lib/gamification/celebration";
import type { ActionBalanceSummary } from "@/lib/gamification/action-balance";
import { ActionBalanceBadge } from "../action-balance-badge";
import { MonthlyRegularityBadge } from "../monthly-regularity-badge";
import { SensitiveZoneBadge } from "../sensitive-zone-badge";

export function InfiniteBadgesPanel({
  totals,
}: {
  totals: {
    wasteKg: number;
    butts: number;
    newPlaces?: number;
    actionsCreated?: number;
    actionBalance?: ActionBalanceSummary;
    monthlyRegularity?: {
      currentStreak: number;
      eligibleMonths: number;
      currentMonthHasEligibleAction: boolean;
      currentGrade: {
        id: string;
        label: string;
        threshold: number;
        iconVariant?: string;
        visualVariant?: string;
        tooltip?: string;
        xp?: number;
      };
      nextGrade: {
        id: string;
        label: string;
        threshold: number;
        iconVariant?: string;
        visualVariant?: string;
        tooltip?: string;
        xp?: number;
      } | null;
      progressPercent: number;
      currentLabel: string;
      nextLabel: string | null;
      monthlyAwards: Array<{
        monthKey: string;
        occurredOn: string;
        actionCount: number;
        streak: number;
        xpAwarded: number;
        sourceId: string;
      }>;
    };
    sensitiveZoneApaisement?: {
      eligibleValidatedActions: number;
      sensitiveAreaCount: number;
      sensitiveAreas: string[];
      currentGrade: {
        id: string;
        label: string;
        threshold: number;
        iconVariant?: string;
        visualVariant?: string;
        tooltip?: string;
        xp?: number;
      };
      nextGrade: {
        id: string;
        label: string;
        threshold: number;
        iconVariant?: string;
        visualVariant?: string;
        tooltip?: string;
        xp?: number;
      } | null;
      progressPercent: number;
      currentLabel: string;
      nextLabel: string | null;
    };
  };
}) {
  const { t } = useTranslation("gamification");

  const items = useMemo(
    () => [
      {
        key: "dechets",
        icon: "leaf",
        title: t("badge.dechets.title"),
        description: t("badge.dechets.description"),
        total: totals.wasteKg,
        step: BADGE_STEP_DECHETS,
        unitLabel: "kg",
      },
      {
        key: "megots",
        icon: "droplets",
        title: t("badge.megots.title"),
        description: t("badge.megots.description"),
        total: totals.butts,
        step: BADGE_STEP_MEGOTS,
        unitLabel: "",
      },
      {
        key: "lieux",
        icon: "map-pin",
        title: "Explorateur",
        description: "Nouveaux lieux nettoyés",
        total: totals.newPlaces ?? 0,
        step: 5,
        unitLabel: "lieux",
      },
      {
        key: "actions",
        icon: "users",
        title: "Actions créées",
        description: "Actions réelles validées par un formulaire",
        total: totals.actionsCreated ?? 0,
        step: 5,
        unitLabel: "actions",
        family: "actions" as const,
      },
    ],
    [t, totals.actionsCreated, totals.butts, totals.newPlaces, totals.wasteKg],
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100/80">
          {t("badge.panel.eyebrow")}
        </p>
        <p className="mt-2 text-sm font-bold text-amber-50/70">
          {t("badge.panel.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <InfiniteBadge
            key={item.key}
            icon={item.icon}
            title={item.title}
            description={item.description}
            total={item.total}
            step={item.step}
            unitLabel={item.unitLabel}
            family={item.family}
            onMilestoneReached={(payload) => {
              dispatchGamificationCelebration({
                title: "Palier infini atteint",
                message: `${payload.title} est maintenant au niveau ${payload.level}.`,
                tone: item.key === "lieux" ? "explorer" : item.key === "actions" ? "actions" : "generic",
                icon: payload.icon,
                source: `infinite-${item.key}`,
              });
            }}
          />
        ))}
      </div>

      {totals.actionBalance ? (
        <div className="pt-1">
          <ActionBalanceBadge summary={totals.actionBalance} />
        </div>
      ) : null}

      {totals.monthlyRegularity ? (
        <div className="pt-1">
          <MonthlyRegularityBadge summary={totals.monthlyRegularity} />
        </div>
      ) : null}

      {totals.sensitiveZoneApaisement ? (
        <div className="pt-1">
          <SensitiveZoneBadge summary={totals.sensitiveZoneApaisement} />
        </div>
      ) : null}
    </div>
  );
}
