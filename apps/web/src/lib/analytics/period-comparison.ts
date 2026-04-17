import type { ActionStatus } from "@/lib/actions/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export type PeriodComparisonRecord = {
  status: ActionStatus;
  observedAt: string;
  createdAt: string | null;
  latitude: number | null;
  longitude: number | null;
  wasteKg: number;
};

export type WindowMetrics = {
  actionsCount: number;
  volumeKg: number;
  coverageRate: number;
  moderationDelayDays: number;
  pendingCount: number;
};

export type MetricDelta = {
  absolute: number;
  percent: number;
  direction: "up" | "down" | "flat";
  strength: "stable" | "moderate" | "strong";
};

export type PeriodComparisonResult = {
  periodDays: number;
  current: WindowMetrics;
  previous: WindowMetrics;
  deltas: {
    actionsCount: MetricDelta;
    volumeKg: MetricDelta;
    coverageRate: MetricDelta;
    moderationDelayDays: MetricDelta;
  };
};

function isFiniteDateMs(raw: string | null | undefined): number | null {
  if (!raw) {
    return null;
  }
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function toDelta(
  current: number,
  previous: number,
  stableThreshold: number,
  moderateThreshold: number,
): MetricDelta {
  const absolute = round1(current - previous);
  const rawPercent =
    previous === 0
      ? current === 0
        ? 0
        : 100
      : round1(((current - previous) / Math.abs(previous)) * 100);
  const absPercent = Math.abs(rawPercent);
  const direction = absolute > 0 ? "up" : absolute < 0 ? "down" : "flat";
  const strength =
    absPercent <= stableThreshold
      ? "stable"
      : absPercent <= moderateThreshold
        ? "moderate"
        : "strong";

  return { absolute, percent: rawPercent, direction, strength };
}

function computeWindowMetrics(
  records: PeriodComparisonRecord[],
  windowEndMs: number,
): WindowMetrics {
  const approved = records.filter((item) => item.status === "approved");
  const actionsCount = approved.length;
  const volumeKg = round1(
    approved.reduce((acc, item) => acc + Number(item.wasteKg || 0), 0),
  );
  const geolocatedApproved = approved.filter(
    (item) =>
      item.latitude !== null &&
      item.longitude !== null &&
      item.latitude >= -90 &&
      item.latitude <= 90 &&
      item.longitude >= -180 &&
      item.longitude <= 180,
  ).length;
  const coverageRate =
    actionsCount > 0 ? round1((geolocatedApproved / actionsCount) * 100) : 0;

  const pendingItems = records.filter((item) => item.status === "pending");
  const pendingAges = pendingItems
    .map((item) => {
      const createdMs = isFiniteDateMs(item.createdAt);
      if (createdMs === null || createdMs > windowEndMs) {
        return null;
      }
      return (windowEndMs - createdMs) / DAY_MS;
    })
    .filter(
      (value): value is number => value !== null && Number.isFinite(value),
    );

  return {
    actionsCount,
    volumeKg,
    coverageRate,
    moderationDelayDays: round1(median(pendingAges)),
    pendingCount: pendingItems.length,
  };
}

export function computePeriodComparison(
  records: PeriodComparisonRecord[],
  periodDays: number,
  now: Date = new Date(),
): PeriodComparisonResult {
  const nowMs = now.getTime();
  const currentFloorMs = nowMs - periodDays * DAY_MS;
  const previousFloorMs = currentFloorMs - periodDays * DAY_MS;

  const currentRecords = records.filter((item) => {
    const observedMs = isFiniteDateMs(item.observedAt);
    return (
      observedMs !== null && observedMs >= currentFloorMs && observedMs <= nowMs
    );
  });

  const previousRecords = records.filter((item) => {
    const observedMs = isFiniteDateMs(item.observedAt);
    return (
      observedMs !== null &&
      observedMs >= previousFloorMs &&
      observedMs < currentFloorMs
    );
  });

  const current = computeWindowMetrics(currentRecords, nowMs);
  const previous = computeWindowMetrics(previousRecords, currentFloorMs);

  return {
    periodDays,
    current,
    previous,
    deltas: {
      actionsCount: toDelta(current.actionsCount, previous.actionsCount, 5, 15),
      volumeKg: toDelta(current.volumeKg, previous.volumeKg, 5, 15),
      coverageRate: toDelta(current.coverageRate, previous.coverageRate, 2, 8),
      moderationDelayDays: toDelta(
        current.moderationDelayDays,
        previous.moderationDelayDays,
        5,
        15,
      ),
    },
  };
}
