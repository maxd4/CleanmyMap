"use client";

import { useMemo } from "react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { InfiniteBadge } from "./InfiniteBadge";
import { announceGamificationGain } from "@/lib/gamification/announcements";
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
    organisationCount?: number;
    actionBalance?: ActionBalanceSummary;
    monthlyRegularity?: {
      activeMonthsTotal: number;
      currentStreakMonths: number;
      longestStreakMonths: number;
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
    sensitiveZoneApaisement?: Parameters<typeof SensitiveZoneBadge>[0]["summary"];
  };
}) {
  const { t } = useTranslation("gamification");

  const items = useMemo(
    () => [
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
        title: "Organisation",
        description: "Actions réellement organisées et validées",
        total: totals.organisationCount ?? 0,
        step: 5,
        unitLabel: "actions",
        family: "actions" as const,
      },
    ],
    [totals.organisationCount, totals.newPlaces],
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
              announceGamificationGain({
                title: "Palier infini atteint",
                message: `${payload.title} est maintenant au niveau ${payload.level}.`,
                tone: item.key === "lieux" ? "explorer" : item.key === "actions" ? "actions" : "generic",
                icon: payload.icon,
                source: `infinite-${item.key}`,
                dedupeKey: `infinite-${item.key}:${payload.level}`,
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
