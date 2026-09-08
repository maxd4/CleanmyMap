export const MAINTENANCE_CRON_PATH = "/api/cron/maintenance";
export const MAINTENANCE_CRON_SCHEDULE = "20 3 * * *";
export const MAINTENANCE_CRON_TIMEZONE = "UTC";

export function getNextMaintenanceCronRun(now = new Date()): Date {
  const nextRun = new Date(now);
  nextRun.setUTCHours(3, 20, 0, 0);

  if (nextRun.getTime() <= now.getTime()) {
    nextRun.setUTCDate(nextRun.getUTCDate() + 1);
  }

  return nextRun;
}
