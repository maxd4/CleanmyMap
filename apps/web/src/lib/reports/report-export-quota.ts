import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  REPORT_EXPORT_TIME_ZONE,
  type ReportExportQuotaReservation,
} from "./report-export-quota-contract";

function formatParisDateParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: REPORT_EXPORT_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
}

export function getReportExportQuotaDay(now = new Date()): string {
  const parts = formatParisDateParts(now);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function parseReservation(value: unknown): ReportExportQuotaReservation {
  const row = Array.isArray(value) ? value[0] : value;
  if (
    !row ||
    typeof row !== "object" ||
    typeof (row as { allowed?: unknown }).allowed !== "boolean" ||
    typeof (row as { quota_day?: unknown }).quota_day !== "string"
  ) {
    throw new Error("Report export quota response is invalid.");
  }

  return {
    allowed: (row as { allowed: boolean }).allowed,
    quotaDay: (row as { quota_day: string }).quota_day,
  };
}

export async function reserveReportExportSlot(
  userId: string,
): Promise<ReportExportQuotaReservation> {
  const { data, error } = await getSupabaseAdminClient().rpc(
    "reserve_report_generation_daily_quota",
    { p_user_id: userId },
  );
  if (error) {
    throw error;
  }
  return parseReservation(data);
}

export async function releaseReportExportSlot(params: {
  userId: string;
  quotaDay: string;
}): Promise<void> {
  const { error } = await getSupabaseAdminClient().rpc(
    "release_report_generation_daily_quota",
    { p_user_id: params.userId, p_quota_day: params.quotaDay },
  );
  if (error) {
    throw error;
  }
}

export async function getReportExportAvailability(
  userId: string,
): Promise<"available" | "used"> {
  const { data, error } = await getSupabaseAdminClient()
    .from("report_generation_daily_quota")
    .select("export_count")
    .eq("user_id", userId)
    .eq("quota_day", getReportExportQuotaDay())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data && Number(data.export_count) >= 1 ? "used" : "available";
}
