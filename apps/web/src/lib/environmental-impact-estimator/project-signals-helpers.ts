import type {
  AppNotificationRow,
  ProjectSignalRows,
} from "./project-signals.calculations";
import { parseDateOrNull } from "./services/utils";

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function countDistinct(values: Array<string | null | undefined>): number {
  return new Set(
    values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)),
  ).size;
}

export function countProjectUnreadNotifications(rows: AppNotificationRow[]): number {
  return rows.filter((row) => row.read_at === null).length;
}

export function countTrainingPhotos(raw: unknown): number {
  if (!isUnknownArray(raw)) {
    return 0;
  }

  return raw.length;
}

export function sumTrainingPhotoBytes(raw: unknown): number {
  if (!isUnknownArray(raw)) {
    return 0;
  }

  return raw.reduce<number>((acc, item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return acc;
    }
    const maybeSize = "size" in item ? item.size : undefined;
    return acc + (typeof maybeSize === "number" && Number.isFinite(maybeSize) ? maybeSize : 0);
  }, 0);
}

export function toMs(value: string | null | undefined): number | null {
  const date = parseDateOrNull(value);
  return date ? date.getTime() : null;
}

export function isWithinWindow(
  value: string | null | undefined,
  fromMs: number,
  untilMs: number,
): boolean {
  const ms = toMs(value);
  return ms !== null && ms >= fromMs && ms <= untilMs;
}

export function getFunnelEventCount(rows: ProjectSignalRows): number {
  return rows.funnelAggregate?.eventCount ?? rows.funnelSignalSummary?.allTime.eventCount ?? rows.funnelEvents.length;
}

export function totalRowsForApiRequests(rows: ProjectSignalRows): number {
  return (
    rows.actions.length +
    rows.spots.length +
    getFunnelEventCount(rows) +
    rows.progressionEvents.length +
    rows.reports.length +
    rows.trainingExamples.length +
    rows.serviceEmails.length +
    rows.communityEvents.length +
    rows.eventRsvps.length +
    rows.appNotifications.length
  );
}
