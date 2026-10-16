import { randomUUID } from "node:crypto";
import {
  normalizeOptionalTextField,
  normalizeTextField,
} from "@/lib/persistence/record-normalizers";
import {
  FEEDBACK_QUALIFICATION_STATUSES,
  FEEDBACK_TRACKING_STATUSES,
  type BugReportRecord,
  type FeedbackQualificationStatus,
  type FeedbackTrackingStatus,
} from "./bug-reports-store-contract";

function isBugReportType(
  value: unknown,
): value is BugReportRecord["reportType"] {
  return (
    value === "bug" ||
    value === "idea" ||
    value === "improvement" ||
    value === "collaboration"
  );
}

function normalizeBugReportSource(
  value: unknown,
): BugReportRecord["source"] {
  return value === "feedback_section" || value === "feedback_discussion"
    ? value
    : "discussion_form";
}

function normalizeBugReportStatus(
  value: unknown,
): BugReportRecord["status"] {
  return value === "treated" || value === "archived" ? value : "open";
}

function normalizeBugReportCreatorState(
  value: unknown,
  status: BugReportRecord["status"],
): BugReportRecord["creatorState"] {
  if (
    value === "pending" ||
    value === "responded" ||
    value === "treated" ||
    value === "archived"
  ) {
    return value;
  }
  if (status === "treated") return "treated";
  if (status === "archived") return "archived";
  return "new";
}

function normalizeScreenshotUploadState(
  value: unknown,
): BugReportRecord["screenshotUploadState"] {
  return value === "pending" || value === "ready" || value === "failed" ? value : null;
}

function normalizeFeedbackQualificationStatus(
  value: unknown,
): FeedbackQualificationStatus {
  return FEEDBACK_QUALIFICATION_STATUSES.includes(
    value as FeedbackQualificationStatus,
  )
    ? (value as FeedbackQualificationStatus)
    : "pending";
}

function normalizeFeedbackTrackingStatus(value: unknown): FeedbackTrackingStatus {
  return FEEDBACK_TRACKING_STATUSES.includes(value as FeedbackTrackingStatus)
    ? (value as FeedbackTrackingStatus)
    : "not_planned";
}

export function normalizeBugReportRecord(record: unknown): BugReportRecord | null {
  if (!record || typeof record !== "object") return null;

  const raw = record as Record<string, unknown>;
  if (!isBugReportType(raw["reportType"])) return null;

  const title = normalizeTextField(raw["title"]);
  const description = normalizeTextField(raw["description"]);
  const pagePath = normalizeOptionalTextField(raw["pagePath"]);
  const submittedByUserId =
    typeof raw["submittedByUserId"] === "string" ? raw["submittedByUserId"] : "unknown";
  const submittedByDisplayName =
    normalizeOptionalTextField(raw["submittedByDisplayName"]) ?? submittedByUserId;
  const submittedByEmail = normalizeOptionalTextField(raw["submittedByEmail"]);
  const submittedByRole = normalizeOptionalTextField(raw["submittedByRole"]);
  const id = typeof raw["id"] === "string" ? raw["id"] : randomUUID();
  const createdAt =
    typeof raw["createdAt"] === "string" ? raw["createdAt"] : new Date().toISOString();
  const source = normalizeBugReportSource(raw["source"]);
  const status = normalizeBugReportStatus(raw["status"]);
  const creatorState = normalizeBugReportCreatorState(raw["creatorState"], status);

  return {
    id,
    createdAt,
    submittedByUserId,
    submittedByDisplayName,
    submittedByEmail,
    submittedByRole,
    source,
    status,
    creatorState,
    screenshotUploadState: normalizeScreenshotUploadState(raw["screenshotUploadState"]),
    qualificationStatus: normalizeFeedbackQualificationStatus(raw["qualificationStatus"]),
    qualificationReason: normalizeOptionalTextField(raw["qualificationReason"]),
    qualificationDecidedAt: normalizeOptionalTextField(raw["qualificationDecidedAt"]),
    qualificationDecidedByUserId: normalizeOptionalTextField(raw["qualificationDecidedByUserId"]),
    qualificationDuplicateFeedbackId: normalizeOptionalTextField(
      raw["qualificationDuplicateFeedbackId"],
    ),
    tracking: {
      status: normalizeFeedbackTrackingStatus(raw["trackingStatus"]),
      publicSummary: normalizeOptionalTextField(raw["trackingPublicSummary"]),
      reference: normalizeOptionalTextField(raw["trackingReference"]),
      shippedOn: normalizeOptionalTextField(raw["trackingShippedOn"]),
      shippedNotificationAt: normalizeOptionalTextField(raw["trackingShippedNotificationAt"]),
      updatedAt: normalizeOptionalTextField(raw["trackingUpdatedAt"]),
      updatedByUserId: normalizeOptionalTextField(raw["trackingUpdatedByUserId"]),
    },
    reportType: raw["reportType"] as BugReportRecord["reportType"],
    title,
    description,
    pagePath,
  };
}

export function fromSupabaseRow(row: Record<string, unknown>): BugReportRecord | null {
  return normalizeBugReportRecord({
    id: row.id,
    createdAt: row.created_at,
    submittedByUserId: row.submitted_by_user_id,
    submittedByDisplayName: row.submitted_by_display_name,
    submittedByEmail: row.submitted_by_email,
    submittedByRole: row.submitted_by_role,
    reportType: row.report_type,
    title: row.title,
    description: row.description,
    pagePath: row.page_path,
    source: row.source,
    status: row.status,
    creatorState: row.creator_state,
    screenshotUploadState: row.screenshot_upload_state,
    qualificationStatus: row.qualification_status,
    qualificationReason: row.qualification_reason,
    qualificationDecidedAt: row.qualification_decided_at,
    qualificationDecidedByUserId: row.qualification_decided_by_user_id,
    qualificationDuplicateFeedbackId: row.qualification_duplicate_feedback_id,
    trackingStatus: row.tracking_status,
    trackingPublicSummary: row.tracking_public_summary,
    trackingReference: row.tracking_reference,
    trackingShippedOn: row.tracking_shipped_on,
    trackingShippedNotificationAt: row.tracking_shipped_notification_at,
    trackingUpdatedAt: row.tracking_updated_at,
    trackingUpdatedByUserId: row.tracking_updated_by_user_id,
  });
}

export function toSupabaseRow(record: BugReportRecord): Record<string, unknown> {
  return {
    id: record.id,
    created_at: record.createdAt,
    submitted_by_user_id: record.submittedByUserId,
    submitted_by_display_name: record.submittedByDisplayName,
    submitted_by_email: record.submittedByEmail,
    submitted_by_role: record.submittedByRole,
    report_type: record.reportType,
    title: record.title,
    description: record.description,
    page_path: record.pagePath,
    source: record.source,
    status: record.status,
    creator_state: record.creatorState,
    qualification_status: record.qualificationStatus ?? "pending",
    qualification_reason: record.qualificationReason ?? null,
    qualification_decided_at: record.qualificationDecidedAt ?? null,
    qualification_decided_by_user_id: record.qualificationDecidedByUserId ?? null,
    qualification_duplicate_feedback_id: record.qualificationDuplicateFeedbackId ?? null,
    tracking_status: record.tracking?.status ?? "not_planned",
    tracking_public_summary: record.tracking?.publicSummary ?? null,
    tracking_reference: record.tracking?.reference ?? null,
    tracking_shipped_on: record.tracking?.shippedOn ?? null,
    tracking_shipped_notification_at: record.tracking?.shippedNotificationAt ?? null,
    tracking_updated_at: record.tracking?.updatedAt ?? null,
    tracking_updated_by_user_id: record.tracking?.updatedByUserId ?? null,
  };
}
