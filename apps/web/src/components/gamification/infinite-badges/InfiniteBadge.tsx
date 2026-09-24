"use client";

import { useMemo } from "react";
import type { BadgeFamily } from "./utils";
import { buildInfiniteBadgeModel } from "./InfiniteBadge.model";
import { InfiniteBadgeView } from "./InfiniteBadgeView";
import { useInfiniteBadgeController } from "./useInfiniteBadgeController";

type InfiniteBadgeProps = {
  icon: string;
  title: string;
  description: string;
  total: number;
  step: number;
  unitLabel?: string;
  family?: BadgeFamily;
  onMilestoneReached?: (payload: {
    level: number;
    title: string;
    icon: string;
    rank: string;
    family?: BadgeFamily;
  }) => void;
};

export function InfiniteBadge({
  icon,
  title,
  description,
  total,
  step,
  unitLabel,
  family,
  onMilestoneReached,
}: InfiniteBadgeProps) {
  const model = useMemo(
    () => buildInfiniteBadgeModel({ icon, title, total, step, family }),
    [family, icon, step, title, total],
  );
  const controller = useInfiniteBadgeController(
    model.level,
    model.displayTitle,
    model.displayIcon,
    model.displayRank,
    family,
    onMilestoneReached,
  );

  return (
    <InfiniteBadgeView
      description={description}
      total={total}
      step={step}
      unitLabel={unitLabel}
      family={family}
      model={model}
      isOpen={controller.isOpen}
      onOpen={controller.open}
      onClose={controller.close}
    />
  );
}
