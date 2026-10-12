import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const IMPORT_VERIFICATION_PAGE_SIZE = 1_000;

export async function verifyImportedRosterCompleteness(
  supabase: SupabaseClient,
  eventId: string,
  importId: string,
  rows: Array<{ rowNumber: number; sourceFingerprint: string }>,
  expectedCount: number,
  useHistoricalRows = false,
  allowAdditionalRows = false,
) {
  if (rows.length !== expectedCount) return false;
  const expected = new Map(rows.map((row) => [row.rowNumber, row.sourceFingerprint]));
  if (expected.size !== rows.length) return false;

  if (useHistoricalRows) {
    const importRecord = await supabase.from("spogomi_roster_imports")
      .select("status, source_proof_status, source_row_count")
      .eq("id", importId)
      .eq("event_id", eventId)
      .maybeSingle();
    if (importRecord.error) throw importRecord.error;
    if (!importRecord.data) return false;
    if (
      importRecord.data.status === "confirmed" &&
      importRecord.data.source_proof_status === "legacy_unavailable" &&
      Number(importRecord.data.source_row_count) === expectedCount
    ) {
      return true;
    }
  }

  const persisted: Array<{ source_row_number: number | null; source_fingerprint: string | null }> = [];
  for (let from = 0; ; from += IMPORT_VERIFICATION_PAGE_SIZE) {
    const page = await supabase
      .from(useHistoricalRows ? "spogomi_roster_import_rows" : "spogomi_participants")
      .select("source_row_number, source_fingerprint")
      .eq("event_id", eventId)
      .eq("roster_import_id", importId)
      .order("source_row_number", { ascending: true })
      .range(from, from + IMPORT_VERIFICATION_PAGE_SIZE - 1);
    if (page.error) throw page.error;
    const rowsOnPage = (page.data ?? []) as Array<{ source_row_number: number | null; source_fingerprint: string | null }>;
    persisted.push(...rowsOnPage);
    if (rowsOnPage.length < IMPORT_VERIFICATION_PAGE_SIZE) break;
  }

  if ((!allowAdditionalRows && persisted.length !== expectedCount) || (allowAdditionalRows && persisted.length < expectedCount)) return false;
  const seen = new Set<number>();
  for (const row of persisted) {
    if (row.source_row_number === null || seen.has(row.source_row_number)) return false;
    if (allowAdditionalRows && !expected.has(row.source_row_number)) {
      seen.add(row.source_row_number);
      continue;
    }
    if (expected.get(row.source_row_number) !== row.source_fingerprint) return false;
    seen.add(row.source_row_number);
  }
  return [...expected.keys()].every((rowNumber) => seen.has(rowNumber));
}
