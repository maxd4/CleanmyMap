export const STORAGE_USAGE_CRON_SCHEDULE = "0 3 1 * *";
export const STORAGE_USAGE_CRON_TIMEZONE = "UTC";

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
  const currentTime = now.getTime();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const thisMonthRun = Date.UTC(year, month, 1, 3, 0, 0, 0);

  if (currentTime < thisMonthRun) {
    return new Date(thisMonthRun);
  }

  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;

  return new Date(Date.UTC(nextYear, nextMonth, 1, 3, 0, 0, 0));
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
    scheduleLabel: "1er du mois à 03:00 UTC",
    timezone: STORAGE_USAGE_CRON_TIMEZONE,
    nextRunAt: nextRun.toISOString(),
    nextRunLabel: formatUtcDateTime(nextRun),
  };
}
