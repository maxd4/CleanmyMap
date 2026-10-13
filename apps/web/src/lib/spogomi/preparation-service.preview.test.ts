import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  confirmSpogomiTeams,
  previewRosterImportChanges,
  previewSpogomiTeams,
} from "./preparation-service";
import type {
  SpogomiRosterPreview,
  SpogomiRosterRow,
} from "./types";

type ReadResult = { data: unknown; error: Error | null };

type QueryCall = {
  table: string;
  method: "eq" | "in" | "order";
  column: string;
  value?: unknown;
  values?: unknown[];
};

function isReadRow(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readOnlySupabase(results: Record<string, ReadResult>, rpc?: ReturnType<typeof vi.fn>) {
  const queryCalls: QueryCall[] = [];
  const client = {
    from(table: string) {
      const result = results[table] ?? { data: [], error: null };
      let data = result.data;
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          queryCalls.push({ table, method: "eq", column, value });
          if (Array.isArray(data) && data.some((row) => isReadRow(row) && column in row)) {
            data = data.filter((row) => isReadRow(row) && row[column] === value);
          }
          return query;
        },
        in: (column: string, values: unknown[]) => {
          queryCalls.push({ table, method: "in", column, values });
          if (Array.isArray(data) && data.some((row) => isReadRow(row) && column in row)) {
            data = data.filter((row) => isReadRow(row) && values.includes(row[column]));
          }
          return query;
        },
        order: (column: string) => {
          queryCalls.push({ table, method: "order", column });
          if (Array.isArray(data)) {
            data = [...data].sort((left, right) => {
              const leftValue = isReadRow(left) ? left[column] : undefined;
              const rightValue = isReadRow(right) ? right[column] : undefined;
              return String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "en", { numeric: true });
            });
          }
          return query;
        },
        then: <TResult1 = ReadResult, TResult2 = never>(
          onfulfilled?: ((value: ReadResult) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) => Promise.resolve({ ...result, data }).then(onfulfilled, onrejected),
      };
      return query;
    },
    rpc: rpc ?? vi.fn(),
  };
  return Object.assign(client as unknown as SupabaseClient, { queryCalls: queryCalls });
}

function rosterRow(overrides: Partial<SpogomiRosterRow> = {}): SpogomiRosterRow {
  return {
    rowNumber: 2,
    name: null,
    groupPreference: null,
    sourceRowId: "ticket-1",
    externalReference: "ticket-1",
    orderReference: "order-1",
    orderAlternativeReference: null,
    ticketStatus: "Payé",
    ticketDeleted: false,
    sourceSystem: "cachan_ticketing",
    sourceFingerprint: "fingerprint-1",
    ...overrides,
  };
}

function preview(
  sourceSystem: "manual_roster" | "cachan_ticketing",
  rows: SpogomiRosterRow[],
  errors: SpogomiRosterPreview["errors"] = [],
): SpogomiRosterPreview {
  return {
    format: "csv",
    fileName: "synthetic.csv",
    contentHash: "hash",
    headers: [],
    unknownHeaders: [],
    mapping: {},
    rows,
    errors,
    probableDuplicateRowNumbers: [],
    sourceSystem,
    cancelledRowNumbers: [],
    encoding: "utf-8",
    sheetName: null,
    headerRow: 1,
    sheetCandidates: [],
    columnDiagnostics: [],
    missingFields: [],
    ambiguousFields: [],
    rowsRead: rows.length,
    ignoredRowNumbers: errors.map((error) => error.rowNumber),
    requiresExplicitSelection: false,
    importKey: "import-key",
  };
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    action_id: "action-1",
    created_by_clerk_id: "organizer-1",
    name: "SPOGOMI synthétique",
    location_label: "Cachan",
    mode: "casual" as const,
    state: "registration_open",
    starts_at: "2026-10-20T09:00:00.000Z",
    ends_at: null,
    team_size_config: { casual: { minMembers: 2, maxMembers: 4 } },
    creation_state: "ready",
    event_slug: "spogomi-synthetic",
    public_visibility: "private" as const,
    public_results_visibility: "hidden" as const,
    composition_revision: 3,
    ...overrides,
  } as Parameters<typeof previewSpogomiTeams>[1];
}

describe("SPOGOMI preparation service previews", () => {
  it("summarizes manual rows without querying ticket reconciliation", async () => {
    const rows = [
      rosterRow({ sourceSystem: "manual_roster", rowNumber: 2, externalReference: null, sourceRowId: "row-2" }),
      rosterRow({ sourceSystem: "manual_roster", rowNumber: 3, externalReference: null, sourceRowId: "row-3" }),
    ];
    const result = await previewRosterImportChanges(
      readOnlySupabase({}),
      event(),
      preview("manual_roster", rows, [{ rowNumber: 3, code: "name_required", message: "nom requis" }]),
    );

    expect(result.rowEffects).toEqual({ "2": "created", "3": "excluded" });
    expect(result.importSummary).toEqual({ created: 1, unchanged: 0, changed: 0, conflicts: 1, excluded: 1 });
  });

  it("returns an empty ticket effect summary when no external reference is available", async () => {
    const result = await previewRosterImportChanges(
      readOnlySupabase({}),
      event(),
      preview("cachan_ticketing", [rosterRow({ externalReference: null, sourceRowId: null })]),
    );

    expect(result.rowEffects).toEqual({});
    expect(result.importSummary).toEqual({ created: 0, unchanged: 0, changed: 0, conflicts: 0, excluded: 0 });
  });

  it("distinguishes created, unchanged, changed, excluded and protected cancellation rows", async () => {
    const rows = [
      rosterRow({ rowNumber: 2, externalReference: "ticket-unchanged", sourceRowId: "ticket-unchanged" }),
      rosterRow({ rowNumber: 3, externalReference: "ticket-changed", sourceRowId: "ticket-changed", orderReference: "order-new" }),
      rosterRow({ rowNumber: 4, externalReference: "ticket-cancelled", sourceRowId: "ticket-cancelled", ticketStatus: "Annulé" }),
      rosterRow({ rowNumber: 5, externalReference: "ticket-protected", sourceRowId: "ticket-protected", ticketStatus: "Annulé", ticketDeleted: true }),
      rosterRow({ rowNumber: 6, externalReference: "ticket-created", sourceRowId: "ticket-created" }),
      rosterRow({ rowNumber: 7, externalReference: "ticket-excluded", sourceRowId: "ticket-excluded" }),
    ];
    const existing = [
      { id: "participant-unchanged", external_reference: "ticket-unchanged", order_reference: "order-1", order_alternative_reference: null, ticket_status: "Payé", ticket_deleted: false, display_name: null, identity_status: "unknown", attendance_status: "unknown", account_link_status: "unlinked", clerk_id: null, team_id: null, registration_status: "registered" },
      { id: "participant-changed", external_reference: "ticket-changed", order_reference: "order-1", order_alternative_reference: null, ticket_status: "Payé", ticket_deleted: false, display_name: null, identity_status: "unknown", attendance_status: "unknown", account_link_status: "unlinked", clerk_id: null, team_id: null, registration_status: "registered" },
      { id: "participant-cancelled", external_reference: "ticket-cancelled", order_reference: "order-1", order_alternative_reference: null, ticket_status: "Payé", ticket_deleted: false, display_name: null, identity_status: "unknown", attendance_status: "present", account_link_status: "unlinked", clerk_id: null, team_id: null, registration_status: "registered" },
      { id: "participant-protected", external_reference: "ticket-protected", order_reference: "order-1", order_alternative_reference: null, ticket_status: "Annulé", ticket_deleted: true, display_name: null, identity_status: "unknown", attendance_status: "unknown", account_link_status: "unlinked", clerk_id: null, team_id: null, registration_status: "withdrawn" },
    ];
    const result = await previewRosterImportChanges(
      readOnlySupabase({
        spogomi_participants: { data: existing, error: null },
        spogomi_roster_import_changes: { data: [{ participant_id: "participant-protected" }], error: null },
      }),
      event(),
      preview("cachan_ticketing", rows, [{ rowNumber: 7, code: "ticket_reference_collision", message: "collision" }]),
    );

    expect(result.rowEffects).toEqual({
      "2": "unchanged",
      "3": "changed",
      "4": "conflict",
      "5": "conflict",
      "6": "created",
      "7": "excluded",
    });
    expect(result.changedRowNumbers).toEqual([3, 4]);
    expect(result.conflictRowNumbers).toEqual([4, 5]);
    expect(result.importSummary).toEqual({ created: 1, unchanged: 2, changed: 2, conflicts: 3, excluded: 1 });
  });

  it("allows a commercial reactivation when matching cancellation history proves the withdrawal source", async () => {
    const result = await previewRosterImportChanges(
      readOnlySupabase({
        spogomi_participants: {
          data: [{ id: "participant-1", external_reference: "ticket-1", order_reference: "order-1", order_alternative_reference: null, ticket_status: "Annulé", ticket_deleted: true, display_name: null, identity_status: "unknown", attendance_status: "unknown", account_link_status: "unlinked", clerk_id: null, team_id: null, registration_status: "withdrawn" }],
          error: null,
        },
        spogomi_roster_import_changes: {
          data: [{ participant_id: "participant-1", change_kind: "ticket_cancelled", current_snapshot: { ticketStatus: "Annulé", ticketDeleted: true } }],
          error: null,
        },
      }),
      event(),
      preview("cachan_ticketing", [rosterRow({ externalReference: "ticket-1", sourceRowId: "ticket-1", ticketStatus: "Payé", ticketDeleted: false })]),
    );

    expect(result.conflictRowNumbers).toEqual([]);
    expect(result.rowEffects).toEqual({ "2": "changed" });
    expect(result.importSummary).toMatchObject({ created: 0, unchanged: 0, changed: 1, conflicts: 0 });
  });

  it("does not treat an imported name as a protected identity decision", async () => {
    const result = await previewRosterImportChanges(
      readOnlySupabase({
        spogomi_participants: {
          data: [{ id: "participant-1", external_reference: "ticket-1", order_reference: "order-1", order_alternative_reference: null, ticket_status: "Payé", ticket_deleted: false, display_name: "Alice Importée", identity_status: "unknown", attendance_status: "unknown", account_link_status: "unlinked", clerk_id: null, team_id: null, registration_status: "registered" }],
          error: null,
        },
        spogomi_roster_import_changes: { data: [], error: null },
      }),
      event(),
      preview("cachan_ticketing", [rosterRow({ externalReference: "ticket-1", sourceRowId: "ticket-1", name: "Alice Importée", ticketStatus: "Annulé" })]),
    );

    expect(result.conflictRowNumbers).toEqual([]);
    expect(result.rowEffects).toEqual({ "2": "changed" });
  });

  it("refuses an active cancelled ticket before proposing any composition", async () => {
    const supabase = readOnlySupabase({
      spogomi_participants: {
        data: [{ id: "participant-1", source_system: "cachan_ticketing", ticket_status: "Annulé", ticket_deleted: false, registration_status: "registered" }],
        error: null,
      },
    });

    await expect(previewSpogomiTeams(supabase, event())).rejects.toThrow(/annulée ou supprimée/i);
  });

  it("refuses a locked event and a previously locked team", async () => {
    await expect(previewSpogomiTeams(readOnlySupabase({}), event({ state: "composition_locked" }))).rejects.toThrow(/déjà verrouillée/i);

    const supabase = readOnlySupabase({
      spogomi_participants: { data: [], error: null },
      spogomi_teams: { data: [{ id: "team-1", team_number: 1, composition_state: "locked" }], error: null },
    });
    await expect(previewSpogomiTeams(supabase, event())).rejects.toThrow(/verrouillée ou vérifiée/i);
  });

  it("previews only admissible registered places and preserves existing draft team ids", async () => {
    const supabase = readOnlySupabase({
      spogomi_participants: {
        data: [
          { id: "p-1", group_preference: "ordre", source_row_number: 1, team_id: null, registration_status: "registered", source_system: "cachan_ticketing", ticket_status: "Payé", ticket_deleted: false },
          { id: "p-2", group_preference: "ordre", source_row_number: 2, team_id: null, registration_status: "registered", source_system: "cachan_ticketing", ticket_status: "Payé", ticket_deleted: false },
          { id: "p-3", group_preference: "ordre", source_row_number: 3, team_id: null, registration_status: "registered", source_system: "cachan_ticketing", ticket_status: "Payé", ticket_deleted: false },
          { id: "p-4", group_preference: "ordre", source_row_number: 4, team_id: null, registration_status: "withdrawn", source_system: "cachan_ticketing", ticket_status: "Payé", ticket_deleted: false },
          { id: "p-5", group_preference: "ordre", source_row_number: 5, team_id: null, registration_status: "withdrawn", source_system: "cachan_ticketing", ticket_status: "Annulé", ticket_deleted: true },
        ],
        error: null,
      },
      spogomi_teams: { data: [{ id: "team-existing", team_number: 4, composition_state: "draft" }], error: null },
    });

    const result = await previewSpogomiTeams(supabase, event());
    expect(result.participantCount).toBe(3);
    expect(result.assignedParticipantCount).toBe(3);
    expect(result.formation.teams[0]?.participantIds).toEqual(["p-1", "p-2", "p-3"]);
    expect(result.formation.unassignedParticipantIds).toEqual([]);
    expect(result.preservedTeamIds).toEqual(["team-existing"]);
    expect(result.explanation.join(" ")).toMatch(/trio/i);
    expect(supabase.queryCalls).toContainEqual({
      table: "spogomi_participants",
      method: "eq",
      column: "registration_status",
      value: "registered",
    });
  });

  it("confirms the exact preview and rejects a stale revision", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { revision: 4 }, error: null });
    const supabase = readOnlySupabase({
      spogomi_participants: {
        data: [
          { id: "p-1", group_preference: null, source_row_number: 1, team_id: null, registration_status: "registered", source_system: "manual_roster", ticket_status: null, ticket_deleted: false },
          { id: "p-2", group_preference: null, source_row_number: 2, team_id: null, registration_status: "registered", source_system: "manual_roster", ticket_status: null, ticket_deleted: false },
          { id: "p-3", group_preference: null, source_row_number: 3, team_id: null, registration_status: "registered", source_system: "manual_roster", ticket_status: null, ticket_deleted: false },
        ],
        error: null,
      },
      spogomi_teams: { data: [], error: null },
    }, rpc);
    const currentEvent = event({ mode: "world_cup", team_size_config: { casual: { minMembers: null, maxMembers: null } } });
    const proposed = await previewSpogomiTeams(supabase, currentEvent);
    const confirmed = await confirmSpogomiTeams({
      supabase,
      event: currentEvent,
      expectedRevision: proposed.expectedRevision,
      proposalFingerprint: proposed.proposalFingerprint,
      actorClerkId: "organizer-1",
    });

    expect(confirmed.confirmed).toBe(true);
    expect(rpc).toHaveBeenCalledWith("spogomi_confirm_team_composition", expect.objectContaining({
      p_event_id: "event-1",
      p_expected_revision: 3,
      p_actor_clerk_id: "organizer-1",
      p_assignments: [{ participantId: "p-1", teamNumber: 1 }, { participantId: "p-2", teamNumber: 1 }, { participantId: "p-3", teamNumber: 1 }],
    }));
    await expect(confirmSpogomiTeams({
      supabase,
      event: currentEvent,
      expectedRevision: proposed.expectedRevision + 1,
      proposalFingerprint: proposed.proposalFingerprint,
      actorClerkId: "organizer-1",
    })).rejects.toThrow(/composition a changé/i);
  });
});
