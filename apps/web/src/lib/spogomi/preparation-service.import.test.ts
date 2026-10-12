import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { confirmRosterImport, verifyImportedRosterCompleteness } from "./preparation-service";

type PersistedRow = { source_row_number: number | null; source_fingerprint: string | null };

function rows(count: number): Array<{ rowNumber: number; sourceFingerprint: string }> {
  return Array.from({ length: count }, (_, index) => ({
    rowNumber: index + 2,
    sourceFingerprint: `fingerprint-${index + 2}`,
  }));
}

function persistedRows(expected: Array<{ rowNumber: number; sourceFingerprint: string }>): PersistedRow[] {
  return expected.map((row) => ({ source_row_number: row.rowNumber, source_fingerprint: row.sourceFingerprint }));
}

function pagedSupabase(pages: Array<{ data: PersistedRow[]; error: Error | null }>) {
  const ranges: Array<[number, number]> = [];
  let pageIndex = 0;
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    range: (from: number, to: number) => {
      ranges.push([from, to]);
      return Promise.resolve(pages[pageIndex++] ?? { data: [], error: null });
    },
  };
  const supabase = {
    from: () => query,
  } as unknown as SupabaseClient;
  return { supabase, ranges };
}

function historicalProofSupabase(proof: Record<string, unknown> | null, persisted: PersistedRow[]) {
  const ranges: Array<[number, number]> = [];
  const importQuery = {
    select: () => importQuery,
    eq: () => importQuery,
    maybeSingle: () => Promise.resolve({ data: proof, error: null }),
  };
  const rowsQuery = {
    select: () => rowsQuery,
    eq: () => rowsQuery,
    order: () => rowsQuery,
    range: (from: number, to: number) => {
      ranges.push([from, to]);
      return Promise.resolve({ data: persisted.slice(from, to + 1), error: null });
    },
  };
  const supabase = {
    from: (table: string) => table === "spogomi_roster_imports" ? importQuery : rowsQuery,
  } as unknown as SupabaseClient;
  return { supabase, ranges };
}

type ImportRecord = {
  id: string;
  event_id: string;
  content_sha256: string;
  import_key: string;
  file_name: string;
  format: string;
  column_mapping: Record<string, string>;
  status: string;
  source_row_count: number;
  imported_by_clerk_id: string;
  processing_token: string | null;
  processing_started_at: string | null;
};

type FakeImportState = {
  imports: ImportRecord[];
  participants: PersistedRow[];
  nextImportId: number;
  failFirstParticipantUpsert: boolean;
  pauseFirstParticipantUpsert?: boolean;
  upsertGate?: Promise<void>;
  upsertStarted?: () => void;
};

class FakeImportQuery {
  private operation: "select" | "insert" | "update" = "select";
  private payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private filters: Record<string, unknown> = {};
  private state: FakeImportState;

  constructor(state: FakeImportState) {
    this.state = state;
  }

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters[column] = value;
    return this;
  }

  or() {
    return this;
  }

  order() {
    return this;
  }

  range(from: number, to: number) {
    const matching = this.state.participants.filter((row) => this.matchesParticipant(row));
    return Promise.resolve({ data: matching.slice(from, to + 1), error: null });
  }

  insert(payload: Record<string, unknown>) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  async upsert(payload: Record<string, unknown>[]) {
    if (this.state.pauseFirstParticipantUpsert) {
      this.state.pauseFirstParticipantUpsert = false;
      this.state.upsertStarted?.();
      await this.state.upsertGate;
    }
    const rowsToInsert = this.state.failFirstParticipantUpsert ? payload.slice(0, 1) : payload;
    this.state.failFirstParticipantUpsert = false;
    for (const row of rowsToInsert) {
      const rowNumber = Number(row.source_row_number);
      if (!this.state.participants.some((current) => current.source_row_number === rowNumber)) {
        this.state.participants.push({
          source_row_number: rowNumber,
          source_fingerprint: String(row.source_fingerprint),
        });
      }
    }
    return Promise.resolve(this.state.participants.length === payload.length || rowsToInsert.length === payload.length
      ? { data: null, error: null }
      : { data: null, error: new Error("simulated partial insert") });
  }

  async maybeSingle() {
    if (this.operation === "insert") return this.executeInsert();
    if (this.operation === "update") return this.executeUpdate();
    const match = this.state.imports.find((record) => this.matchesImport(record)) ?? null;
    return { data: match, error: null };
  }

  then<TResult1 = { data: unknown; error: Error | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.operation === "update" ? this.executeUpdate() : { data: null, error: null }).then(onfulfilled, onrejected);
  }

  private matchesImport(record: ImportRecord) {
    return Object.entries(this.filters).every(([column, value]) => record[column as keyof ImportRecord] === value);
  }

  private matchesParticipant(row: PersistedRow) {
    return this.filters.event_id === "event-1" && this.filters.roster_import_id === "import-1" && row.source_row_number !== null;
  }

  private executeInsert() {
    const payload = this.payload as Record<string, unknown>;
    if (this.state.imports.some((record) => record.content_sha256 === payload.content_sha256)) {
      return { data: null, error: { code: "23505" } };
    }
    const record: ImportRecord = {
      id: `import-${this.state.nextImportId++}`,
      event_id: String(payload.event_id),
      content_sha256: String(payload.content_sha256),
      import_key: String(payload.import_key),
      file_name: String(payload.file_name),
      format: String(payload.format),
      column_mapping: payload.column_mapping as Record<string, string>,
      status: String(payload.status),
      source_row_count: Number(payload.source_row_count),
      imported_by_clerk_id: String(payload.imported_by_clerk_id),
      processing_token: String(payload.processing_token),
      processing_started_at: String(payload.processing_started_at),
    };
    this.state.imports.push(record);
    return { data: record, error: null };
  }

  private executeUpdate() {
    const record = this.state.imports.find((candidate) => this.matchesImport(candidate));
    if (!record) return { data: null, error: null };
    Object.assign(record, this.payload);
    return { data: { id: record.id }, error: null };
  }
}

function importSupabase(state: FakeImportState): SupabaseClient {
  return { from: () => new FakeImportQuery(state) } as unknown as SupabaseClient;
}

function importEvent() {
  return { id: "event-1" } as Parameters<typeof confirmRosterImport>[0]["event"];
}

function importFile() {
  return new File(["Nom;Groupe\nAda Lovelace;A\nGrace Hopper;B"], "roster.csv", { type: "text/csv" });
}

describe("SPOGOMI roster import completeness mock contract", () => {
  it("accepts a confirmed pre-proof import without claiming detailed historical proof", async () => {
    const expected = rows(2);
    const { supabase, ranges } = historicalProofSupabase({
      status: "confirmed",
      source_proof_status: "legacy_unavailable",
      source_row_count: expected.length,
    }, []);

    await expect(verifyImportedRosterCompleteness(supabase, "event", "import", expected, expected.length, true)).resolves.toBe(true);
    expect(ranges).toEqual([]);
  });

  it("rejects a recent import whose detailed proof is genuinely incomplete", async () => {
    const expected = rows(2);
    const { supabase } = historicalProofSupabase({
      status: "failed_recoverable",
      source_proof_status: "pending",
      source_row_count: expected.length,
    }, persistedRows(expected.slice(0, 1)));

    await expect(verifyImportedRosterCompleteness(supabase, "event", "import", expected, expected.length, true)).resolves.toBe(false);
  });

  it("reads and verifies an import containing 1,001 rows", async () => {
    const expected = rows(1_001);
    const { supabase, ranges } = pagedSupabase([
      { data: persistedRows(expected.slice(0, 1_000)), error: null },
      { data: persistedRows(expected.slice(1_000)), error: null },
    ]);

    await expect(verifyImportedRosterCompleteness(supabase, "event", "import", expected, expected.length)).resolves.toBe(true);
    expect(ranges).toEqual([[0, 999], [1_000, 1_999]]);
  });

  it("continues through several pages instead of trusting the default 1,000-row response", async () => {
    const expected = rows(2_501);
    const { supabase, ranges } = pagedSupabase([
      { data: persistedRows(expected.slice(0, 1_000)), error: null },
      { data: persistedRows(expected.slice(1_000, 2_000)), error: null },
      { data: persistedRows(expected.slice(2_000)), error: null },
    ]);

    await expect(verifyImportedRosterCompleteness(supabase, "event", "import", expected, expected.length)).resolves.toBe(true);
    expect(ranges).toEqual([[0, 999], [1_000, 1_999], [2_000, 2_999]]);
  });

  it("rejects a missing row hidden by a duplicate while the persisted count remains correct", async () => {
    const expected = rows(3);
    const persisted = persistedRows([expected[0], expected[1], expected[1]]);
    const { supabase } = pagedSupabase([{ data: persisted, error: null }]);

    await expect(verifyImportedRosterCompleteness(supabase, "event", "import", expected, expected.length)).resolves.toBe(false);
  });

  it("fails closed when an exhaustive page cannot be read", async () => {
    const expected = rows(1_001);
    const databaseError = new Error("database read failed");
    const { supabase } = pagedSupabase([
      { data: persistedRows(expected.slice(0, 1_000)), error: null },
      { data: [], error: databaseError },
    ]);

    await expect(verifyImportedRosterCompleteness(supabase, "event", "import", expected, expected.length)).rejects.toThrow("database read failed");
  });

  it("confirms the first import and leaves it without a duplicate on identical replay", async () => {
    const state: FakeImportState = { imports: [], participants: [], nextImportId: 1, failFirstParticipantUpsert: false };
    const supabase = importSupabase(state);
    const first = await confirmRosterImport({ supabase, event: importEvent(), userId: "organizer", file: importFile() });
    const replay = await confirmRosterImport({ supabase, event: importEvent(), userId: "organizer", file: importFile() });

    expect(first).toMatchObject({ importedRows: 2, alreadyImported: false });
    expect(replay).toMatchObject({ importedRows: 2, alreadyImported: true });
    expect(state.imports).toHaveLength(1);
    expect(state.imports[0]?.status).toBe("confirmed");
    expect(state.participants).toHaveLength(2);
  });

  it("does not accept a confirmed import whose exhaustive participant read is incomplete", async () => {
    const state: FakeImportState = { imports: [], participants: [], nextImportId: 1, failFirstParticipantUpsert: false };
    const supabase = importSupabase(state);
    await confirmRosterImport({ supabase, event: importEvent(), userId: "organizer", file: importFile() });
    state.participants.pop();

    await expect(confirmRosterImport({ supabase, event: importEvent(), userId: "organizer", file: importFile() })).rejects.toThrow(/import confirmé est incomplet/i);
    expect(state.imports[0]?.status).toBe("confirmed");
  });

  it("reprises un import après une insertion participante partielle", async () => {
    const state: FakeImportState = { imports: [], participants: [], nextImportId: 1, failFirstParticipantUpsert: true };
    const supabase = importSupabase(state);

    await expect(confirmRosterImport({ supabase, event: importEvent(), userId: "organizer", file: importFile() })).rejects.toThrow(/import non finalisé/i);
    expect(state.imports[0]?.status).toBe("failed_recoverable");
    await expect(confirmRosterImport({ supabase, event: importEvent(), userId: "organizer", file: importFile() })).resolves.toMatchObject({ importedRows: 2 });
    expect(state.imports[0]?.status).toBe("confirmed");
    expect(state.participants).toHaveLength(2);
  });

  it("refuses one of two concurrent confirmations of the same file", async () => {
    const state: FakeImportState = { imports: [], participants: [], nextImportId: 1, failFirstParticipantUpsert: false };
    const supabase = importSupabase(state);
    let releaseUpsert!: () => void;
    let signalUpsertStarted!: () => void;
    const upsertGate = new Promise<void>((resolve) => { releaseUpsert = resolve; });
    const upsertStarted = new Promise<void>((resolve) => { signalUpsertStarted = resolve; });
    state.pauseFirstParticipantUpsert = true;
    state.upsertGate = upsertGate;
    state.upsertStarted = signalUpsertStarted;

    const first = confirmRosterImport({ supabase, event: importEvent(), userId: "organizer-a", file: importFile() });
    await upsertStarted;
    const second = confirmRosterImport({ supabase, event: importEvent(), userId: "organizer-b", file: importFile() });
    await expect(second).rejects.toThrow(/déjà en cours|concurrent/i);
    releaseUpsert();
    await expect(first).resolves.toMatchObject({ importedRows: 2, alreadyImported: false });
    expect(state.imports).toHaveLength(1);
    expect(state.imports[0]?.status).toBe("confirmed");
    expect(state.participants).toHaveLength(2);
  });
});
