export const REPORT_EXPORT_DAILY_LIMIT = 1;
export const REPORT_EXPORT_TIME_ZONE = "Europe/Paris";

export type ReportExportAvailability = "available" | "used" | "unavailable";

export type ReportExportQuotaReservation = {
  allowed: boolean;
  quotaDay: string;
};
