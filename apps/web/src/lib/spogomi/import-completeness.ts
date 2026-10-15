import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const IMPORT_VERIFICATION_PAGE_SIZE = 1_000;

type ProofRow = { rowNumber: number; sourceFingerprint: string };
type PersistedProofRow = { source_row_number: number | null; source_fingerprint: string | null };

async function verifyImportedRosterRows(
  supabase: SupabaseClient,
  eventId: string,
  importId: string,
  rows: ProofRow[],
  expectedCount: number,
  useHistoricalRows = false,
  mode: "selection" | "document" = "document",
  divisionId?: string,
) {
  if (rows.length !== expectedCount) return false;
  const expected = new Map(rows.map((row) => [row.rowNumber, row.sourceFingerprint]));
  if (expected.size !== rows.length) return false;

  if (useHistoricalRows && mode === "document") {
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

  const persisted: PersistedProofRow[] = [];
  for (let from = 0; ; from += IMPORT_VERIFICATION_PAGE_SIZE) {
    let pageQuery = supabase
      .from(useHistoricalRows ? "spogomi_roster_import_rows" : "spogomi_participants")
      .select("source_row_number, source_fingerprint")
      .eq("event_id", eventId)
      .eq("roster_import_id", importId)
      .order("source_row_number", { ascending: true })
      .range(from, from + IMPORT_VERIFICATION_PAGE_SIZE - 1);
    if (divisionId) pageQuery = pageQuery.eq("division_id", divisionId);
    const page = await pageQuery;
    if (page.error) throw page.error;
    const rowsOnPage = (page.data ?? []) as Array<{ source_row_number: number | null; source_fingerprint: string | null }>;
    persisted.push(...rowsOnPage);
    if (rowsOnPage.length < IMPORT_VERIFICATION_PAGE_SIZE) break;
  }

  if (mode === "document" ? persisted.length !== expectedCount : persisted.length < expectedCount) return false;
  const seen = new Set<number>();
  for (const row of persisted) {
    if (row.source_row_number === null || seen.has(row.source_row_number)) return false;
    if (mode === "selection" && !expected.has(row.source_row_number)) {
      seen.add(row.source_row_number);
      continue;
    }
    if (expected.get(row.source_row_number) !== row.source_fingerprint) return false;
    seen.add(row.source_row_number);
  }
  return [...expected.keys()].every((rowNumber) => seen.has(rowNumber));
}

export function verifyImportedRosterSelection(
  supabase: SupabaseClient,
  eventId: string,
  importId: string,
  rows: ProofRow[],
  expectedCount: number,
  useHistoricalRows = false,
  divisionId?: string,
) {
  return verifyImportedRosterRows(supabase, eventId, importId, rows, expectedCount, useHistoricalRows, "selection", divisionId);
}

export function verifyImportedRosterCompleteness(
  supabase: SupabaseClient,
  eventId: string,
  importId: string,
  rows: ProofRow[],
  expectedCount: number,
  useHistoricalRows = false,
  divisionId?: string,
) {
  return verifyImportedRosterRows(supabase, eventId, importId, rows, expectedCount, useHistoricalRows, "document", divisionId);
}
