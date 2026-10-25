import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  REPORT_EXPORT_DAILY_LIMIT,
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

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSupabaseResponse(value: unknown): { data: unknown; error: unknown | null } {
  if (!isRecord(value) || !("data" in value) || !("error" in value)) {
    throw new Error("Supabase response is invalid.");
  }
  return { data: value.data, error: value.error };
}

function parseReservation(value: unknown): ReportExportQuotaReservation {
  const row = isUnknownArray(value) ? value[0] : value;
  if (!isRecord(row)) {
    throw new Error("Report export quota response is invalid.");
  }

  if (typeof row.allowed !== "boolean" || typeof row.quota_day !== "string") {
    throw new Error("Report export quota response is invalid.");
  }

  return {
    allowed: row.allowed,
    quotaDay: row.quota_day,
  };
}

export async function reserveReportExportSlot(
  userId: string,
): Promise<ReportExportQuotaReservation> {
  const response = parseSupabaseResponse(await getSupabaseAdminClient().rpc(
    "reserve_report_generation_daily_quota",
    { p_user_id: userId },
  ));
  if (response.error) {
    throw response.error;
  }
  return parseReservation(response.data);
}

export async function releaseReportExportSlot(params: {
  userId: string;
  quotaDay: string;
}): Promise<void> {
  const response = parseSupabaseResponse(await getSupabaseAdminClient().rpc(
    "release_report_generation_daily_quota",
    { p_user_id: params.userId, p_quota_day: params.quotaDay },
  ));
  if (response.error) {
    throw response.error;
  }
}

export async function getReportExportAvailability(
  userId: string,
): Promise<"available" | "used"> {
  const response = parseSupabaseResponse(await getSupabaseAdminClient()
    .from("report_generation_daily_quota")
    .select("export_count")
    .eq("user_id", userId)
    .eq("quota_day", getReportExportQuotaDay())
    .maybeSingle());

  if (response.error) {
    throw response.error;
  }

  const record = isRecord(response.data) ? response.data : null;
  return record && Number(record.export_count) >= REPORT_EXPORT_DAILY_LIMIT
    ? "used"
    : "available";
}
