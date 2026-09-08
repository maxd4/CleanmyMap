import {
  getNextMaintenanceCronRun,
  MAINTENANCE_CRON_SCHEDULE,
  MAINTENANCE_CRON_TIMEZONE,
} from "@/lib/periodic/maintenance-cron-contract";

export const STORAGE_USAGE_CRON_SCHEDULE = MAINTENANCE_CRON_SCHEDULE;
export const STORAGE_USAGE_CRON_TIMEZONE = MAINTENANCE_CRON_TIMEZONE;

export type StorageUsageCronStatus = {
  configured: boolean;
  statusLabel: string;
  schedule: string;
  scheduleLabel: string;
  timezone: string;
  nextRunAt: string;
  nextRunLabel: string;
};

export function getNextStorageUsageCronRun(now = new Date()): Date {
  return getNextMaintenanceCronRun(now);
}

function formatUtcDateTime(value: Date): string {
  const day = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: STORAGE_USAGE_CRON_TIMEZONE,
  }).format(value);

  const time = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: STORAGE_USAGE_CRON_TIMEZONE,
  }).format(value);

  return `${day} à ${time} UTC`;
}

export function buildStorageUsageCronStatus(
  configured: boolean,
  now = new Date(),
): StorageUsageCronStatus {
  const nextRun = getNextStorageUsageCronRun(now);

  return {
    configured,
    statusLabel: configured ? "Configuré" : "À configurer",
    schedule: STORAGE_USAGE_CRON_SCHEDULE,
    scheduleLabel: "Tous les jours à 03:20 UTC (dispatcher commun)",
    timezone: STORAGE_USAGE_CRON_TIMEZONE,
    nextRunAt: nextRun.toISOString(),
    nextRunLabel: formatUtcDateTime(nextRun),
  };
}
