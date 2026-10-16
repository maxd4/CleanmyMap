import { join } from "node:path";
import {
  readLocalRecordStore,
  writeLocalRecordStore,
} from "@/lib/persistence/local-record-store";
import {
  normalizeBugReportRecord,
} from "./bug-reports-store-normalization";
import type { BugReportRecord } from "./bug-reports-store-contract";

const STORE_FILE = join(
  process.cwd(),
  "data",
  "local-db",
  "community_bug_reports.json",
);

export const SUPABASE_BUG_REPORT_COLUMNS =
  "id, created_at, submitted_by_user_id, submitted_by_display_name, submitted_by_email, submitted_by_role, report_type, title, description, page_path, source, status, creator_state, screenshot_upload_state, qualification_status, qualification_reason, qualification_decided_at, qualification_decided_by_user_id, qualification_duplicate_feedback_id, tracking_status, tracking_public_summary, tracking_reference, tracking_shipped_on, tracking_shipped_notification_at, tracking_updated_at, tracking_updated_by_user_id";

type StorePayload = {
  updatedAt: string;
  records: BugReportRecord[];
};

export async function readStore(): Promise<StorePayload> {
  return readLocalRecordStore(STORE_FILE, normalizeBugReportRecord);
}

export async function writeStore(store: StorePayload): Promise<void> {
  await writeLocalRecordStore(STORE_FILE, store.records);
}
