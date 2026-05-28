"use client";

import { useMemo } from "react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { InfiniteBadge } from "./InfiniteBadge";
import { BADGE_STEP_DECHETS, BADGE_STEP_MEGOTS } from "@/config/gamification.config";

export function InfiniteBadgesPanel({
  totals,
}: {
  totals: { wasteKg: number; butts: number; newPlaces?: number };
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
    ],
    [t, totals.butts, totals.wasteKg, totals.newPlaces],
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
          />
        ))}
      </div>
    </div>
  );
}

